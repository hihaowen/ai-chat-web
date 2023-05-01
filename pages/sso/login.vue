<template>
	<web-view :src="loginUrl" @message="handleMessage"></web-view>
</template>

<script>
	import {
		mapState,
		mapMutations
	} from 'vuex';

	import {
		checkCodeProcess,
		saveLoginInfo,
	} from '../../common/sso.js'

	export default {
		computed: mapState(['loginUrl']),
		data() {
			return {
				redirect_url: "",
				is_tab: false,
			}
		},
		onInit(options) {

		},
		onLoad(options) {
			if (typeof options.redirect_url === "string" && options.redirect_url !== "") {
				this.redirect_url = decodeURIComponent(options.redirect_url)
				console.log("设置了上一页:", this.redirect_url)
			}
			if (typeof options.is_tab !== undefined) {
				this.is_tab = true
				console.log("上一页是tab")
			}
		},
		onReady() {

		},
		mounted() {
			this.$nextTick(() => {
				// H5接收postMessage类型消息的话还得是靠下面这个
				window.addEventListener('message', this.onMessage);
			})
		},
		destroyed() {
			// 在组件生命周期结束的时候销毁。
			window.removeEventListener("message", this.onMessage);
		},
		methods: {
			goback() {
				if (this.redirect_url !== "") {
					if (this.is_tab) {
						uni.switchTab({
							url: this.redirect_url
						})
					} else {
						uni.navigateTo({
							url: this.redirect_url
						})
					}
					console.log("返回上一页:", this.redirect_url)
				} else {
					uni.navigateBack()
					console.log("返回上一页")
				}
			},
			onMessage(event) {
				if (typeof event.data.data !== 'undefined') {
					console.log("收到同步信息:", JSON.stringify(event.data.data))

					let info = event.data.data.arg
					checkCodeProcess(info.code, (result) => {
						if (result.errno == 200) { // 正常
							// 设置浏览器登入态
							saveLoginInfo(result.data);
							this.login(result.data)
							console.log(info.domain + ' 已通知登入.')
							// 返回上一页
							this.goback()
						} else { // 错误
							console.error('同步登入异常: ' + result.error)
						}
					});
				}
			},
			handleMessage(event) {
				console.log("收到同步消息:", event)
			},
			...mapMutations(['login']),
		}
	}
</script>

<style>

</style>