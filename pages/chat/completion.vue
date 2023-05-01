<template>
	<view class="container">
		<scroll-view scroll-y="true"
			:style="{'height': (windowObj.windowHeight - windowObj.statusBarHeight - 100 + 'px')}"
			:scroll-top="scrollHeight">
			<view class="scroll-view">
				<block v-for="(item, index) in chatList">
					<view class="chat-item" :class="item.role==='user'?'me':'other'">
						<image class="avatar" v-if="item.role!=='user'" src="/static/robot.png"></image>
						<text class="msg" v-if="item.content" @click="copyResult( index )">{{item.content}}</text>
						<text class="msg" v-else>{{item.placeholder}}</text>
						<image class="avatar" v-if="item.role==='user'" src="/static/user.jpg"></image>
					</view>
				</block>
			</view>
		</scroll-view>

		<view class="input-box">
			<uni-icons type="trash" size="20" @click="clearChat" :style="{
			      position: 'absolute',
			      left: '5px',
			      top: '25px',
			    }"></uni-icons>
			<textarea class="input" v-model="message" @keyup.enter.exact="send" :focus="inputFocus" @blur="onblur"
				maxlength="4096" placeholder-style="" placeholder="请输入消息发送" />
			<uni-icons type="paperplane" size="30" class="send" @click="send" :loading="sending"></uni-icons>
		</view>
	</view>
</template>
<script>
	import {
		chatApi
	} from '../../package.json'

	import {
		getAccessToken
	} from '../../common/sso.js'

	import {
		debounce,
	} from '../../common/utils.js'

	import {
		EventStreamContentType,
		fetchEventSource
	} from '@microsoft/fetch-event-source';

	class RetriableError extends Error {}
	class FatalError extends Error {}
	class UnauthorizedError extends Error {}
	class UpgradeRequiredError extends Error {}
	class InterruptError extends Error {}

	export default {
		data() {
			return {
				message: '',
				chatList: [],
				sending: false,
				ctrl: new AbortController(),
				inputFocus: true,
				scrollHeight: 0,
			}
		},
		onReady() {},
		mounted() {

		},
		computed: {
			windowObj() {
				let obj;
				uni.getSystemInfo({
					success: res => {
						obj = res;
					}
				})

				return obj
			}
		},
		methods: {
			clearChat() {
				this.chatList = [];
				this.abortResult();
			},
			setScrollTop() {
				try {
					let query = uni.createSelectorQuery().in(this);
					query
						.select('.scroll-view')
						.fields({
							size: true
						}, data => {
							let height = data.height;
							this.scrollHeight = height;
						}).exec();
				} catch (e) {
					console.error("这个错误暂时不用关注.")
				}
			},
			abortResult() {
				this.ctrl.abort();
				this.sending = false;
				this.ctrl = new AbortController();
				console.log("停止回答");
			},
			// 添加复制结果的方法
			copyResult(index) {
				uni.setClipboardData({
					data: this.chatList[index].content,
					success() {
						uni.showToast({
							title: "已复制",
							icon: "success",
						});
					},
				});
			},
			onblur() {
				this.inputFocus = false;
			},
			onUnload() {
				this.abortResult();
			},
			send() {
				if (this.sending === true) {
					this.abortResult();
					return;
				}

				if (this.message === "") {
					this.inputFocus = false;
					this.$nextTick(() => {
						this.inputFocus = true;
					});
					return;
				}

				this.sending = true // 发送中设置为true,禁止再次点击发送
				this.chatList.push({
					role: 'user',
					placeholder: "",
					content: this.message,
				})
				this.message = '' // 清空输入框

				// 发送请求获取机器人回复
				let robotIndex = this.chatList.push({
					role: 'assistant',
					placeholder: "思考中...",
					content: "",
				})
				robotIndex -= 1

				debounce(this.setScrollTop, 50)

				fetchEventSource(chatApi + `/chat/streaming_completion`, {
					signal: this.ctrl.signal,
					method: 'POST',
					openWhenHidden: true,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': getAccessToken(),
					},
					body: JSON.stringify(this.chatList.filter((item) => {
						return item.content !== ''
					})),
					async onopen(response) {
						if (response.ok && response.headers.get('content-type') ===
							EventStreamContentType) {
							console.log("onopen OK")
							return;
						} else if (response.status === 401) { // 未登录或登录失效
							throw new UnauthorizedError();
						} else if (response.status === 426) { // 需要开通会员
							throw new UpgradeRequiredError();
						} {
							throw new FatalError("onopen failed, status: " + response.status);
						}
					},
					onmessage: (msg) => {
						// if the server emits an error message, throw an exception
						// so it gets handled by the onerror callback below:
						if (msg.event === 'InterruptError') {
							throw new InterruptError(msg.data);
						}

						const data = JSON.parse(msg.data);
						if (data.data === "[DONE]") {
							console.log("结束.");
							return
						}

						this.chatList[robotIndex].content += data.data;

						debounce(this.setScrollTop, 500)
					},
					onclose() {
						// if the server closes the connection unexpectedly, retry:
						console.log("服务器关闭连接.")
					},
					onerror(err) {
						throw err;
					}
				}).catch((err) => {
					let msg = `请求失败`
					if (err instanceof UnauthorizedError) {
						msg = '未登录或登录失效'
						uni.showToast({
							title: msg,
							icon: "none",
							complete: () => {
								setTimeout(function() {
									uni.navigateTo({
										url: '/pages/sso/login'
									})
								}, 1500);
							},
						});
					} else if (err instanceof UpgradeRequiredError) {
						msg = '免费额度已用尽'
						uni.showToast({
							title: msg,
							icon: "none",
							complete: () => {
								setTimeout(function() {
									uni.navigateTo({
										url: '/pages/member/index'
									})
								}, 1500);
							},
						});
					} else if (err instanceof InterruptError) {
						msg = 'Stream发送中断'
						uni.showToast({
							title: msg,
							icon: "none",
						});
					} else {
						console.log(err.name + `: ${err.message}`)
						uni.showToast({
							title: msg,
							icon: "none",
						});
					}
				}).finally(() => {
					console.log('全部完成.');
					this.sending = false; // 获取回复后可以再次发送,设置为false
					this.inputFocus = true;
					this.setScrollTop();
				});
			}
		}
	}
</script>
<style>
	.container {
		background-color: antiquewhite;
	}

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
	}

	.title {
		color: #fff;
		font-size: 32px;
		margin-left: 20px;
	}

	.chat-item {
		display: flex;
		padding: 10px;
	}

	.me {
		justify-content: flex-end;
	}

	.other {
		justify-content: flex-start;
	}

	.msg {
		max-width: 70%;
		border-radius: 10px;
		padding: 20px;
		font-size: 16px;
	}

	.chat-item image {
		width: 50px;
		height: 50px;
		margin: 0px 10px;
	}

	.me .msg {
		background-color: #40a9ff;
		color: #fff;
	}

	.other .msg {
		background-color: #fff;
	}

	.input-box {
		display: flex;
		position: fixed;
		width: 100%;
		height: 100px;
		bottom: var(--window-bottom);
		left: 0;
		align-items: center;
		background-color: #fff;
	}

	.input {
		flex: 1;
		margin: 0 30px;
		height: 50px;
		font-size: 16px;
	}

	.send {
		/* width: 80px; */
		/* background-color: #40a9ff; */
		/* color: #40a9ff;
		font-size: 14px; */
		margin-right: 10px;
	}

	.input-box button {
		height: 30px;
		font-size: 14px;
	}
</style>