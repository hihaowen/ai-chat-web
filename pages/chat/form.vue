<template>
	<view class="container">
		<uni-card is-full>
			<text class="uni-h6">{{ form.description }}</text>
		</uni-card>

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
							popup-title="请选择" @change="onPickerChange(field.id, $event)" :clear="false">
						</uni-data-select>
					</view>

					<view v-if="field.type === 'radio'" :label="field.name" :required="field.required">
						<uni-data-checkbox :multiple="false" v-model="formData[field.id]"
							:localdata="field.optional_value" @change="onRadioChange(field.id, $event)" />
					</view>
				</view>

			</uni-section>

			<view class="uni-px-5 uni-pb-5">
				<button type="primary" form-type="submit" :loading="sending">点击生成</button>
			</view>
		</form>

		<!-- 生成的答案部分，添加点击复制功能 -->
		<uni-section title="生成的答案" type="line">
			<view v-if="result" id="resultView" @click="copyResult" class="uni-px-5 uni-pb-5">
				<text>{{ result }}</text>
			</view>
		</uni-section>
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
				form: {}, // 从 API 获取的表单数据
				formData: {}, // 用于存储表单输入值的对象
				result: '', // 用于存储生成的答案
				sending: false, // 是否正在生成答案
				ctrl: new AbortController(),
				windowHeight: 0, // 窗口高度
				userScrollTop: 0, // 用户滑动高度
			};
		},
		onLoad(options) {
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
						return {
							value: option.value,
							text: option.value
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

				fetchEventSource(url, {
					signal: this.ctrl.signal,
					method: 'POST',
					openWhenHidden: true,
					headers: {
						'Content-Type': 'application/json',
						'Authorization': getAccessToken(),
					},
					body: JSON.stringify(this.formData),
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

						// console.log(data.data)
						this.result += data.data;
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
										url: '/pages/sso/member'
									})
								}, 1500);
							},
						});
					} else if (err instanceof InterruptError) {
						msg = '服务端发送中断'
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
							title: "答案已复制",
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