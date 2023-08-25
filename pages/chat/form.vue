<template>
	<view class="container">
		<uni-card is-full>
			<text class="uni-h6">{{ form.description }}</text>
		</uni-card>

		<!-- <uni-section :title="$t('template.modelTitle')" type="line">
			<view class="uni-px-5 uni-pb-5">
				<SelectModel @model-change="handleCurrentModel" />
			</view>
		</uni-section> -->

		<form @submit.prevent="submitForm">
			<uni-section v-for="(field, index) in form.fields" :key="index" :title="field.name" type="line">
				<view class="uni-px-5 uni-pb-5">
					<view v-if="field.type === 'input'" :label="field.name" :required="field.required">
						<uni-easyinput v-model="formData[field.id]" :placeholder="field.name" />
					</view>

					<view v-if="field.type === 'textarea'" :label="field.name" :required="field.required">
						<uni-easyinput type="textarea" maxlength="2000" v-model="formData[field.id]"
							:placeholder="field.name" />
					</view>

					<view v-if="field.type === 'select'" :label="field.name" :required="field.required">
						<uni-data-select v-model="formData[field.id]" :localdata="field.optional_value"
							popup-title="$t('template.selectPlaceholder')" @change="onPickerChange(field.id, $event)"
							:clear="false">
						</uni-data-select>
					</view>

					<view v-if="field.type === 'radio'" :label="field.name" :required="field.required">
						<uni-data-checkbox :multiple="false" v-model="formData[field.id]"
							:localdata="field.optional_value" @change="onRadioChange(field.id, $event)" />
					</view>
				</view>
			</uni-section>
			
			<view class="uni-px-5 uni-pb-5">
				<button type="primary" form-type="submit" :loading="sending">{{$t('template.clickToGenerate')}}</button>
			</view>
		</form>

		<uni-section v-if="result" :title="$t('template.generatedAnswer')" type="line">
			<view v-if="formId === 'draw-image'" class="uni-px-5 uni-pb-5">
				<button type="primary" plain="true"
					@click="openBrowser('https://t.me/+sIDQPSkgOYljNTg1')">可以在Telegram上关注生图进度</button>
			</view>
			
			<view id="resultView" class="uni-px-5 uni-pb-5">
				<!-- <text selectable="true" v-html="result"></text> -->
				<text selectable="true" v-html="renderMarkdown(result)"></text>
			</view>
		</uni-section>
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
			return `<pre><code class="hljs${language ? ` language-${language}` : ''}">${highlightedCode}</code></pre>`;
		},
	};
	marked.use({
		renderer
	});

	import {
		chatApi
	} from '../../package.json'

	import SelectModel from '../../components/SelectModel.vue';

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
	class RateLimitError extends Error {}
	class TimeoutError extends Error {}

	export default {
		components: {
			SelectModel,
		},
		data() {
			return {
				formId: "",
				form: {}, // 从 API 获取的表单数据
				formData: {}, // 用于存储表单输入值的对象
				result: '', // 用于存储生成的答案
				sending: false, // 是否正在生成答案
				ctrl: new AbortController(),
				windowHeight: 0, // 窗口高度
				userScrollTop: 0, // 用户滑动高度
				currentSelectedModel: "gpt-3.5-turbo-16k",
				currentPageInfo: {},
			};
		},
		onLoad(options) {
			this.currentPageInfo = {
				route: this.$mp.page.route,
				params: this.$root.$mp.query
			};

			this.formId = options.form;

			this.fetchForm(options.form);

			// 获取窗口高度
			uni.getSystemInfo({
				success: (res) => {
					this.windowHeight = res.windowHeight;
				},
			});
		},
		onPageScroll(e) {
			if (this.userScrollTop > e.scrollTop) {
				console.log('用户向上滑动了')
			}

			this.userScrollTop = e.scrollTop
		},
		watch: {
			// 使用watch来响应数据的变化
			result(newVal, oldVal) {
				debounce(this.scrollToBottom, 3000)
			}
		},
		methods: {
			openBrowser(url) {
				// plus.runtime.openURL(url)
				window.location.href = url;
			},
			renderMarkdown(text) {
				let res = text ? marked(text) : ''
				return res.replace(/<img/g, '<img style="max-width:100%;height:auto" ')
			},
			handleCurrentModel(newModel) {
				if (newModel) {
					this.currentSelectedModel = newModel
				}
			},
			scrollToBottom() {
				const query = uni.createSelectorQuery();
				query.select('#resultView').boundingClientRect();
				query.exec((res) => {
					if (res === null || res[0] === null) {
						return
					}

					const contentHeight = res[0].height;
					const scrollHeight = res[0].top + contentHeight;

					// console.log("userScrollTop:", this.userScrollTop, "div top:", res[0].top, scrollHeight, "-",
					// 	this.windowHeight,
					// 	scrollHeight - this.windowHeight)

					// 判断用户是否已经在底部
					if (this.userScrollTop >= scrollHeight - this.windowHeight) {
						uni.pageScrollTo({
							scrollTop: 99999999,
							duration: 0,
						})
					}
				});
			},
			async fetchForm(form) {
				// 根据 form 参数调整 API 请求
				const res = await uni.request({
					url: chatApi + `/chat/${form}`,
					method: "GET",
				});
				this.data = res.data.data
				this.form = res.data.data.form;

				uni.setNavigationBarTitle({
					title: this.form.name
				});

				this.initFormData();
			},
			initFormData() {
				this.form.fields.forEach((field) => {
					if (field.type === 'input' || field.type === 'select' || field.type === 'textarea') {
						const checkedOption = field.optional_value.find(option => option.checked);
						this.formData[field.id] = checkedOption ? checkedOption.value : '';
					} else if (field.type === 'radio') {
						const checkedOption = field.optional_value.find(option => option.checked);
						this.formData[field.id] = checkedOption.value;
					} else {
						this.formData[field.id] = '';
					}

					field.optional_value = field.optional_value.map(function(option) {
						let text = typeof option.text === 'undefined' ? option.value : option.text
						return {
							value: option.value,
							text: text
						}
					});
				});
			},
			onUnload() {
				this.abortResult();
			},
			abortResult() {
				this.ctrl.abort();
				this.sending = false;
				this.ctrl = new AbortController();
				console.log("停止回答");
			},
			submitForm() {
				if (this.sending === true) {
					this.abortResult();
					return;
				}

				const formId = this.data.form_id;
				const url = chatApi + `/chat/streaming_completion/${formId}`;

				this.sending = true;
				this.result = ''; // 清空当前答案

				let formData = this.formData
				formData["model"] = this.currentSelectedModel

				fetchEventSource(url, {
					signal: this.ctrl.signal,
					method: 'POST',
					openWhenHidden: true,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': getAccessToken(),
					},
					body: JSON.stringify(formData),
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
						} else if (msg.event === 'FatalError') {
							throw new FatalError(msg.data);
						} else if (msg.event === 'RateLimitError') {
							throw new RateLimitError(msg.data);
						} else if (msg.event === 'TimeoutError') {
							throw new RateLimitError(msg.data);
						}

						const data = JSON.parse(msg.data);

						if (msg.event === 'DoneSummary') {
							console.log("Done Summary:", data.data);

							// 如果total_cost等于模型最大限制,则认为当前完成内容不完整
							if (data.data.total_cost >= data.data.max_token_limit) {
								console.log("当前内容可能不完整!")
							}

							return
						}

						if (data.data === "[DONE]") {
							console.log("结束.");
							return
						}

						if (this.currentSelectedModel === "bing" || msg.event === 'functionCall') {
							this.result = data.data;
						} else {
							this.result += data.data;
						}

						// console.log(data.data)
					},
					onclose() {
						// if the server closes the connection unexpectedly, retry:
						console.log("服务器关闭连接.")

						// throw new RetriableError();
					},
					onerror(err) {
						// if (err instanceof FatalError) {
						// 	throw err; // rethrow to stop the operation
						// } else {
						// 	// do nothing to automatically retry. You can also
						// 	// return a specific retry interval here.
						// }

						// 这里主要是为了重试

						throw err;
					}
				}).catch((err) => {
					let msg = this.$t('jsContent.requestFailed')
					if (err instanceof UnauthorizedError) {
						msg = this.$t('jsContent.unauthorized')
						uni.showToast({
							title: msg,
							icon: "none",
							complete: () => {
								setTimeout(() => {
									let route = this.currentPageInfo.route
									let form = this.currentPageInfo.params.form
									let redirectUrl = "/" + route + "?form=" + form
									let url =
										`/pages/sso/login?redirect_url=${encodeURIComponent(redirectUrl)}`;
									console.log("back url:", url)
									uni.navigateTo({
										url: url,
									})
								}, 1000);
							},
						});
					} else if (err instanceof UpgradeRequiredError) {
						msg = this.$t('jsContent.insufficientFood')
						uni.showToast({
							title: msg,
							icon: "none",
							complete: () => {
								setTimeout(function() {
									uni.navigateTo({
										url: '/pages/sso/member'
									})
								}, 1000);
							},
						});
					} else if (err instanceof InterruptError) {
						msg = this.$t('jsContent.serverInterrupt')
					} else if (err instanceof FatalError) {
						msg = this.$t('jsContent.serverFatal')
					} else if (err instanceof RateLimitError) {
						msg = this.$t('jsContent.rateLimitError')
					} else if (err instanceof TimeoutError) {
						msg = this.$t('jsContent.timeoutError')
					} else {
						console.log(err.name + `: ${err.message}`)
					}
					this.result = `[${msg}]`
				}).finally(() => {
					this.sending = false;
					console.log('全部完成.');
				});
			},
			onPickerChange(fieldId, value) {
				console.log("Select下拉框:", fieldId, value)
				this.formData[fieldId] = value;
			},
			onRadioChange(fieldId, event) {
				console.log("Radio选择", fieldId, event)
				this.formData[fieldId] = event.detail.value;
			},
			// 添加复制结果的方法
			copyResult() {
				uni.setClipboardData({
					data: this.result,
					success() {
						uni.showToast({
							title: this.$t('jsContent.answerCopied'),
							icon: "success",
						});
					},
				});
			},
		},
	};
</script>

<style lang="scss">
	.text {
		font-size: 12px;
		color: #666;
		margin-top: 5px;
	}

	.uni-px-5 {
		padding-left: 10px;
		padding-right: 10px;
	}

	.uni-pb-5 {
		padding-bottom: 10px;
	}
</style>