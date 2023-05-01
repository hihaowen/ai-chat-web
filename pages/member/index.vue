<template>
	<web-view :src="ssoServerUrl" @message="handleMessage"></web-view>
</template>

<script>
	import {
		mapState,
	} from 'vuex';

	export default {
		computed: mapState(['ssoServerUrl']),
		data() {
			return {}
		},
		onInit(options) {

		},
		onLoad(options) {

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
			onMessage(event) {
				if (typeof event.data.data !== 'undefined') {
					console.log("收到同步信息:", JSON.stringify(event.data.data))
				}
			},
			handleMessage(event) {
				console.log("收到同步消息:", event)
			},
		}
	}
</script>

<style>

</style>