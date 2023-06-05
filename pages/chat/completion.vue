<template>
	<view class="container">
		<scroll-view scroll-y="true"
			:style="{'height': (windowObj.windowHeight - windowObj.statusBarHeight - 100 + 'px')}"
			:scroll-top="scrollHeight">
			<view class="scroll-view">
				<block v-for="(item, index) in chatList">
					<view class="chat-item" :class="item.role==='user'?'me':'other'">
						<image class="avatar" v-if="item.role!=='user'" src="/static/robot.png"></image>

						<view class="msg"
							:style="item.role==='error' ? {backgroundColor: '#FF69B4', color: 'white'} : {}">

							<uni-icons v-if="item.role === 'user' && editingIndex !== index" @click="editMessage(index)"
								type="compose" :style="{
				      color: '#fff',
					  position: 'absolute',
					  right: '5px',
					  top: '5px',
					  fontSize: '16px',
				    }" />

							<div v-if="item.role === 'user' && editingIndex === index">
								<input v-model="tempMessage" focus="true" />
								<div :style="{
					  position: 'absolute',
					  right: '5px',
					  top: '5px',
				    }">
									<button class="btn-mini" :style="{
														  marginRight: '5px',
													    }" @click="saveMessage(index)">{{$t('button.save')}}</button>
									<button class="btn-mini" @click="cancelEdit">{{$t('button.cancel')}}</button>
								</div>
							</div>

							<div v-else>
								<CopyButton v-if="item.content && item.role==='assistant'" :textToCopy="item.content" />
								<text v-if="item.content !== ''" selectable="true"
									v-html="renderMarkdown(item.content)">
								</text>
								<text v-else class="placeholder">
									<span class="loading-dot"></span>
									<span class="loading-dot"></span>
									<span class="loading-dot"></span>
								</text>
							</div>
						</view>

						<image class="avatar" v-if="item.role==='user'" src="/static/user.jpg"></image>
					</view>
				</block>
			</view>
		</scroll-view>

		<view class="input-box">
			<view class="toolbar">
				<view class="tool-container" @click="clearChat">
					<uni-tooltip :content="$t('toolbar.clearRecord')">
						<uni-icons type="trash" size="16" />
					</uni-tooltip>
				</view>
				<view class="tool-container" @click="exportChat">
					<uni-tooltip :content="$t('toolbar.exportRecord')">
						<uni-icons type="download" size="16" />
					</uni-tooltip>
				</view>
				<view class="tool-container" @click="clickFileInput">
					<uni-tooltip :content="$t('toolbar.importRecord')">
						<uni-icons type="upload" size="16" />
					</uni-tooltip>
				</view>
				<view class="tool-container">
					<uni-tooltip :content="$t('toolbar.memoryWarning')">
						<switch class="memory-switch" :checked="isMemoryMode.checked" @change="switchMemoryMode" />
					</uni-tooltip>
				</view>
				<view class="tool-container">
					<SelectModel @model-change="handleCurrentModel" />
				</view>
			</view>
			<div class="input-container">
				<textarea class="input" v-model="message" @keydown.13.exact.prevent="send(message)" maxlength="4096"
					:placeholder="$t('input.enterToSend')" focus="true" auto-height fixed="true" />
			</div>
			<button v-if="chatList.some(item => item.role === 'user')" class="generate-button"
				@click="sending ? abortResult() : regenerateLastAssistantMessage()">
				{{sending ? $t('button.stopGenerating') : $t('button.regenerateResult')}}
			</button>
		</view>
	</view>
</template>

<script>
	import hljs from 'highlight.js';
	import 'highlight.js/styles/atom-one-dark.css'

	import {
		marked
	} from 'marked';

	marked.setOptions({
		silent: true,
		xhtml: true,
		breaks: true,
		gfm: true,
	});
	const renderer = {
		code(code, lang) {
			let language = 'plaintext';
			// 强制设置类型,解决卡顿问题
			let highlightedCode = hljs.highlight('javascript', code).value;

			// let highlightedCode;
			// try {
			// 	highlightedCode = hljs.highlightAuto(code).value;
			// } catch {
			// 	language = hljs.getLanguage(lang) ? lang : 'plaintext';
			// 	highlightedCode = hljs.highlight(code, {
			// 		language
			// 	}).value;
			// }
			// console.log("language:", language)

			return `<pre><code class="hljs${language ? ` language-${language}` : ''}">${highlightedCode}</code></pre>`;
		},
	};
	marked.use({
		renderer
	});

	import Vue from 'vue'

	import CopyButton from '../../components/CopyButton.vue';
	import SelectModel from '../../components/SelectModel.vue';

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
		props: ['session', 'currentPageRoute'],
		components: {
			CopyButton,
			SelectModel,
		},
		data() {
			return {
				message: '',
				chatList: [],
				sending: false,
				ctrl: new AbortController(),
				scrollHeight: 0,
				editingIndex: -1,
				tempMessage: "",
				isMemoryMode: {
					checked: true
				},
				currentSelectedModel: "gpt-3.5-turbo",
				enterKeyPressed: false,
			}
		},
		onLoad() {},
		onReady() {

		},
		mounted() {
			// 记忆模式
			this.isMemoryMode.checked = localStorage.getItem('memoryMode') === 'true';
		},
		watch: {
			session: {
				immediate: true,
				async handler(newSession, oldSession) {
					if (newSession !== oldSession) {
						console.log("会话已改变,重新加载聊天记录...");
						this.abortResult()
						// 当 session 改变时，重新加载聊天记录
						this.chatList = this.loadChatList()
					} else {
						console.log("会话未改变,毋需重新加载聊天记录");
					}
				}
			},
		},
		created() {

		},
		updated() {
			this.addCopyButtonIfNecessary();
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
			},
		},
		methods: {
			loadChatList() {
				const savedChatList = localStorage.getItem('chatList-' + this.session.id);
				if (savedChatList) {
					return JSON.parse(savedChatList);
				}
				return [];
			},
			handleCurrentModel(newModel) {
				if (newModel) {
					this.currentSelectedModel = newModel
				}
			},
			switchMemoryMode(e) {
				let value = e.target.value
				this.$set(this.isMemoryMode, 'checked', value)
				// 当 isMemoryMode 发生变化时，将其保存到 localStorage
				localStorage.setItem('memoryMode', value.toString());
				console.log("用户切换记忆模式:", value)
			},
			cancelEdit() {
				// 退出编辑状态
				this.editingIndex = -1;
				// 清空临时变量
				this.tempMessage = "";
			},
			editMessage(index) {
				this.editingIndex = index;
				// 将当前消息内容赋值给一个临时变量
				this.tempMessage = this.chatList[index].content;
			},
			saveMessage(index) {
				// 更新用户消息内容
				this.chatList[index].content = this.tempMessage;
				// 清空临时变量
				this.tempMessage = "";
				// 退出编辑状态
				this.editingIndex = -1;
				// 丢弃当前修改的消息往后的内容
				this.chatList.splice(index + 1);
				// 触发重新生成功能
				this.send(this.chatList[index].content, true);
			},
			renderMarkdown(text) {
				return text ? marked(text) : ''
			},
			addCopyButtonIfNecessary() {
				document.querySelectorAll('pre').forEach(el => {
					if (el.classList.contains('code-copy-added')) return
					// https://cn.vuejs.org/v2/api/index.html#Vue-extend
					/* 使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象 */
					let ComponentClass = Vue.extend(CopyButton)
					let instance = new ComponentClass()
					instance.textToCopy = el.innerText
					instance.iconStyle = {
						width: '0.8rem',
						height: '0.8rem',
						fill: 'white',
					}
					instance.copyTextStyle = {
						color: "white"
					}

					/* 手动挂载 */
					instance.$mount()
					el.classList.add('code-copy-added')
					el.appendChild(instance.$el)
				})
			},
			clickFileInput() {
				let self = this

				uni.chooseFile({
					count: 1,
					extension: ['.json'],
					success: function(res) {
						// TODO
						console.log("用户选择的文件:", JSON.stringify(res.tempFilePaths));

						const fileUrl = res.tempFilePaths[0];
						fetch(fileUrl)
							.then(response => response.json())
							.then(data => {
								// console.log("用户选择的文件内容:", data)
								if (Array.isArray(data) && data.every(item => typeof item === 'object' &&
										'role' in item &&
										'content' in item)) {
									self.chatList = data;
									self.saveChat();
								} else {
									alert(this.$t('alert.invalidChatRecordFile'));
								}
							})
							.catch((error) => {
								console.log('Error:', error);
							});
					}
				});
			},
			clearChat() {
				if (window.confirm(this.$t('confirm.clearRecord'))) {
					this.chatList = [];
					this.abortResult();
					localStorage.removeItem('chatList-' + this.session.id);
				}
			},
			exportChat() {
				const a = document.createElement('a');
				const file = new Blob([JSON.stringify(this.chatList)], {
					type: 'application/json'
				});
				a.href = URL.createObjectURL(file);
				a.download = 'chat.json';
				a.click();
			},
			importChat(e) {
				const file = e.target.files[0];
				if (file) {
					const reader = new FileReader();
					reader.onload = (e) => {
						const data = JSON.parse(e.target.result);
						if (Array.isArray(data) && data.every(item => typeof item === 'object' && 'role' in item &&
								'content' in item)) {
							this.chatList = data;
							this.saveChat();
						} else {
							alert(this.$t('alert.invalidChatRecordFile'));
						}
					};
					reader.readAsText(file);
				}
			},
			saveChat() {
				localStorage.setItem('chatList-' + this.session.id, JSON.stringify(this.chatList));
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
				this.removeLastInvalidMessage();
				this.cancelEdit();
				console.log("停止回答");
			},
			onUnload() {
				this.abortResult();
			},
			// 清除最后一条无效记录: error、空信息
			removeLastInvalidMessage() {
				let lastIdx = this.chatList.length - 1
				if (this.chatList[lastIdx]) {
					if (this.chatList[lastIdx].role != 'user' && this.chatList[lastIdx].role != 'assistant' ||
						this.chatList[lastIdx].content.length === 0) {
						this.chatList.splice(lastIdx, 1);
					}
				}
			},
			regenerateLastAssistantMessage() {
				let lastUserMessage = '';
				for (let i = this.chatList.length - 1; i >= 0; i--) {
					// 确保元素存在
					if (this.chatList[i]) {
						if (this.chatList[i].role !== 'user') {
							this.chatList.splice(i, 1);
						} else {
							lastUserMessage = this.chatList[i].content;
							break;
						}
					}
				}

				if (lastUserMessage !== '') {
					this.removeLastInvalidMessage();
					this.$nextTick(() => {
						this.send(lastUserMessage, true);
					});
				}
			},
			send(message = this.message, isRegenerating = false) {
				if (message === "" && !isRegenerating) {
					return;
				}

				this.sending = true;
				this.ctrl = new AbortController();

				if (!isRegenerating) {
					this.chatList.push({
						role: 'user',
						content: message,
					});
					this.message = '';
				}

				// 发送请求获取机器人回复
				let robotIndex = this.chatList.push({
					role: 'assistant',
					content: "",
				}) - 1;

				debounce(this.setScrollTop, 50);

				let dataToSend = this.chatList.filter((item) => {
					return (item.role === 'user' ||
							item.role === 'assistant' ||
							item.role === 'system') &&
						item.content !== ""
				})
				dataToSend = this.isMemoryMode.checked ? dataToSend : [dataToSend[dataToSend.length - 1]];

				fetchEventSource(chatApi + `/chat/streaming_completion`, {
					signal: this.ctrl.signal,
					method: 'POST',
					openWhenHidden: true,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': getAccessToken(),
					},
					body: JSON.stringify({
						"model": this.currentSelectedModel,
						"messages": dataToSend,
					}),
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

						if (msg.event === 'DoneSummary') {
							console.log("Done Summary:", data.data);

							// 如果total_cost等于模型最大限制,则认为当前完成内容不完整
							if (data.data.total_cost >= data.data.max_token_limit) {
								console.log("当前内容可能不完整!")
							}

							return;
						}

						if (data.data === "[DONE]") {
							console.log("结束.");
							return
						}

						if (this.currentSelectedModel === "bing") {
							this.chatList[robotIndex].content = data.data;
						} else {
							this.chatList[robotIndex].content += data.data;
						}

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
					let msg = this.$t('jsContent.requestFailed')
					if (err instanceof UnauthorizedError) {
						msg = this.$t('jsContent.unauthorized')
						setTimeout(() => {
							uni.navigateTo({
								url: '/pages/sso/login?redirect_url=/' + encodeURIComponent(this
									.currentPageRoute),
							})
						}, 1500);
					} else if (err instanceof UpgradeRequiredError) {
						msg = this.$t('jsContent.insufficientFood')
						setTimeout(function() {
							uni.navigateTo({
								url: '/pages/sso/member'
							})
						}, 1500);
					} else if (err instanceof InterruptError) {
						msg = this.$t('jsContent.serverInterrupt')
					} else {
						console.log(err.name + `: ${err.message}`)
					}

					this.chatList[robotIndex].role = "error"
					this.chatList[robotIndex].content = `[${msg}]`
				}).finally(() => {
					console.log('全部完成.');
					this.sending = false;
					this.setScrollTop();
					this.saveChat();
				});
			}
		}
	}
</script>
<style>
	.container {
		background-color: antiquewhite;
		overflow: hidden;
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
		padding: 15px;
	}

	.me {
		justify-content: flex-end;
	}

	.other {
		justify-content: flex-start;
	}

	.msg {
		display: inline;
		min-width: 10%;
		max-width: 70%;
		border-radius: 10px;
		padding: 20px;
		font-size: 16px;
		position: relative;
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

	/deep/ .code-copy-added {
		position: relative;
	}

	.input-box {
		height: 100px;
		position: relative;
		background-color: #fff;
	}

	.toolbar {
		display: flex;
		align-items: center;
		padding: 5px 0;
		margin-left: 20px;
		/* overflow: hidden; */
	}

	.tool-container {
		/* display: flex;
		justify-content: space-between;
		align-items: center; */
		padding: 0 10px;
	}

	.memory-switch {
		transform: scale(0.4);
	}

	.input-container {
		height: 55px;
		/* background-color: aquamarine; */

		position: relative;
		/* Ensure that the textarea is positioned relative to this element */
		display: flex;
		justify-content: center;
		/* Horizontally center children */
		align-items: flex-end;
		/* Vertically align children at the bottom */
	}

	.input-container .input {
		padding: 10px;
		border-radius: 4px;
		border: 1px solid #ccc;
		background-color: #f8f8f8;
		width: 80%;
		min-height: 20px;
		bottom: 6px;
		z-index: 999;
	}

	.input-container .send-button {
		height: 40px;
		flex-shrink: 0;
	}

	.generate-button {
		position: absolute;
		top: -30px;
		left: 50%;
		transform: translateX(-50%);
		height: 30px;
		line-height: 30px;
		font-size: 14px;
	}
</style>