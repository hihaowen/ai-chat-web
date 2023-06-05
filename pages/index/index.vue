<template>
	<view class="home">
		<uni-list-item :title="$t('index.title')" :note="$t('index.note')" thumb="/static/logo.png" thumb-size="lg" />

		<uni-notice-bar show-get-more show-icon scrollable :text="$t('index.notice')" @getmore="buyMember" />

		<view class="content">
			<uni-card :title="$t('index.aichat-title')" :sub-title="$t('index.aichat-sub-title')"
				:extra="$t('index.aichat-btn')" thumbnail="/static/robot-icon.png" @click="startChat">
				<text class="uni-body">{{$t('index.aichat-desc')}}</text>
			</uni-card>

			<uni-card :title="$t('index.form-title')" :sub-title="$t('index.form-sub-title')"
				:extra="$t('index.form-btn')" thumbnail="/static/app-icon.png" @click="formChat">
			</uni-card>

			<uni-card :title="$t('index.pdf-title')" :sub-title="$t('index.pdf-sub-title')" :extra="$t('index.pdf-btn')"
				thumbnail="/static/pdf-icon.png" @click="pdfChat">
				<text class="uni-body">{{$t('index.aichat-desc')}}</text>
			</uni-card>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {

			}
		},
		onLoad() {

		},
		methods: {
			startChat(e) {
				uni.navigateTo({
					url: `/pages/chat/manager`
				})
			},
			formChat(e) {
				uni.switchTab({
					url: `/pages/index/app`
				})
			},
			pdfChat(e) {
				uni.showToast({
					title: this.$t('index.pdf-notice'),
					icon: "none",
				});
			},
			buyMember(e) {
				uni.navigateTo({
					url: '/pages/sso/member'
				})
			}
		}
	}
</script>

<style>
	.home {}

	.content {
		padding: 20rpx 20rpx 20rpx 20rpx;
	}
</style>