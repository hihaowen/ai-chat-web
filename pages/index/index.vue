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

			<uni-card title="PDF对话" sub-title="就像聊天一样，轻松提取和理解PDF内容，随需生成个性化PDF。" extra="去对话 >"
				thumbnail="/static/pdf-icon.png" @click="pdfChat">
				<text class="uni-body">擅长：深度解析和定制生成PDF文件。
					能力：从多种PDF格式提取并理解内容，将对话保存为PDF。
					技术：结合文本解析和大语言模型，处理复杂的PDF文件。
					优点：自动化处理PDF以提升效率，深度理解内容，界面简洁易用。
				</text>
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
			pdfChat(e) {
				uni.showToast({
					title: "敬请期待",
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