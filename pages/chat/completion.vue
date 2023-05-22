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

							<button v-if="item.role === 'user' && editingIndex !== index" @click="editMessage(index)"
								class="btn-mini">编辑</button>

							<div v-if="item.role === 'user' && editingIndex === index">
								<input v-model="tempMessage" />
								<button class="btn-mini" @click="saveMessage(index)">保存</button>
								<button class="btn-mini" @click="cancelEdit">取消</button>
							</div>

							<div v-else>
								<CopyButton v-if="item.content && item.role==='assistant'" :textToCopy="item.content" />
								<text v-if="item.content !== ''" selectable="true"
									v-html="renderMarkdown(item.content)">
								</text>
								<text v-else class="placeholder">思考中...</text>
							</div>
						</view>

						<image class="avatar" v-if="item.role==='user'" src="/static/user.jpg"></image>
					</view>
				</block>
			</view>
		</scroll-view>

		<view class="input-box">
			<button v-if="chatList.some(item => item.role === 'user')" class="generate-button"
				@click="sending ? abortResult() : regenerateLastAssistantMessage()">
				{{sending ? '停止生成' : '重新生成结果'}}
			</button>

			<view>
				<uni-icons type="trash" size="20" @click="clearChat" :style="{
				      position: 'absolute',
				      left: '5px',
				      top: '5px',
				    }"></uni-icons>
				<uni-icons type="download" size="20" @click="exportChat"
					:style="{position: 'absolute', left: '40px', top: '5px',}"></uni-icons>
				<uni-icons type="upload" size="20" @click="clickFileInput"
					style="position: absolute; left: 75px; top: 5px;"></uni-icons>
				<view :style="{position: 'absolute', left: '110px', top: '0px', lineHeight: '14px'}">
					开启记忆
					<switch :checked="isMemoryMode.checked" @change="switchMemoryMode"
						:style="{transform: 'scale(0.5)'}" />
				</view>
				<view class="uni-px-5 uni-pb-5"
					:style="{position: 'absolute', left: '220px', top: '0px', width: '150px'}">
					<SelectModel @model-change="handleCurrentModel" />
				</view>
			</view>
			<textarea class="input" v-model="message" @keyup.enter.exact="send(message)" :focus="inputFocus"
				@blur="onblur" maxlength="4096" placeholder-style="" placeholder="请输入消息发送" />
			<button type="primary" @click="send(message)" :loading="sending">发送</button>
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
			let highlightedCode;
			try {
				highlightedCode = hljs.highlightAuto(code).value;
			} catch {
				language = hljs.getLanguage(lang) ? lang : 'plaintext';
				highlightedCode = hljs.highlight(code, {
					language
				}).value;
			}
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
		props: ['session'],
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
				inputFocus: true,
				scrollHeight: 0,
				editingIndex: -1,
				tempMessage: "",
				isMemoryMode: {
					checked: true
				},
				currentSelectedModel: "gpt-3.5-turbo",
			}
		},
		onLoad() {

		},
		onReady() {},
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
				// TODO
				// console.log("开始update...")
				document.querySelectorAll('pre').forEach(el => {
					// TODO
					// console.log(el)
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
									alert('无效的聊天记录文件');
								}
							})
							.catch((error) => {
								console.log('Error:', error);
							});
					}
				});
			},
			clearChat() {
				if (window.confirm("确认清空记录?")) {
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
							alert('无效的聊天记录文件');
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
			onblur() {
				this.inputFocus = false;
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
					this.inputFocus = false;
					this.$nextTick(() => {
						this.inputFocus = true;
					});
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
						setTimeout(function() {
							uni.navigateTo({
								url: '/pages/sso/login'
							})
						}, 1500);
					} else if (err instanceof UpgradeRequiredError) {
						msg = '猫粮吃完了'
						setTimeout(function() {
							uni.navigateTo({
								url: '/pages/sso/member'
							})
						}, 1500);
					} else if (err instanceof InterruptError) {
						msg = '发送中断'
					} else {
						console.log(err.name + `: ${err.message}`)
					}

					this.chatList[robotIndex].role = "error"
					this.chatList[robotIndex].content = `[${msg}]`
				}).finally(() => {
					console.log('全部完成.');
					this.sending = false;
					this.inputFocus = true;
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

	.input-box {
		display: flex;
		position: relative;
		width: 100%;
		height: 100px;
		bottom: var(--window-bottom);
		left: 0;
		align-items: center;
		background-color: #fff;
	}

	.generate-button {
		position: absolute;
		top: -30px;
		left: 50%;
		transform: translateX(-50%);
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

	/deep/ .code-copy-added {
		position: relative;
	}

	.btn-mini {
		display: inline-block;
		line-height: 1.5;
		font-size: 12px;
		padding: 0 0.5em;
	}
</style>