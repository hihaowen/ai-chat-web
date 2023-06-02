<template>
	<view class="home">
		<uni-list-item title="猫说" note="通过 AI 技术实现的智能对话，帮助您更快捷地解决问题。" thumb="/static/logo.png" thumb-size="lg" />

		<uni-notice-bar show-get-more show-icon scrollable text="最新增加Bing模型,基于GPT-4模型,支持实时搜索。" @getmore="buyMember" />

		<view class="content">
			<uni-card title="AI对话" sub-title="像和朋友一样聊天，随时随地获得各类知识。" extra="去试试 >" thumbnail="/static/robot-icon.png"
				@click="startChat">
				<text class="uni-body">擅长: 聊天、写作、翻译、推理等
					能力: 多窗口对话,历史记录导入、导出,支持记忆
					技术: 基于大语言模型构建
				</text>
			</uni-card>

			<uni-card title="智能表单" sub-title="与 Ai 完成一问一答形式的表单，快速获取答案。" extra="去提问 >" thumbnail="/static/app-icon.png"
				@click="formChat">
			</uni-card>
		</view>
	</view>
</template>

<script>
	export default {
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
		padding: 20rpx 20rpx 0 20rpx;
	}
</style>