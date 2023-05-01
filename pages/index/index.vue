<template>
	<view class="home">
		<view class="banner">
			<image class="logo" src="/static/robot.png"></image>
			<view class="title">懒猫</view>
		</view>
		<view class="content">
			<view class="intro">
				<view class="intro-title">
					<text>通过 Ai 技术实现的智能对话，帮助您更快捷地解决问题。</text>
				</view>
				<view class="intro-btn">
					<button class="btn-start" @click="startChat">开始对话</button>
				</view>
			</view>
			<view class="features">
				<view class="feature-item" @click="formChat">
					<image class="feature-icon" src="/static/app-icon.png"></image>
					<text class="feature-title">智能表单</text>
					<text class="feature-desc">与 Ai 完成一问一答形式的表单，快速获取答案。</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		methods: {
			startChat() {
				uni.navigateTo({
					url: `/pages/chat/completion`
				})
			},
			formChat() {
				uni.switchTab({
					url: `/pages/index/app`
				})
			}
		}
	}
</script>

<style>
	.home {}

	.banner {
		height: 200rpx;
		background-color: #ffffff;
		display: flex;
		justify-content: center;
		align-items: center;
		font-size: 32rpx;
		font-weight: bold;
		color: #333333;
	}

	.logo {
		height: 100rpx;
		width: 100rpx;
		margin-right: 20rpx;
	}

	.title {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.content {
		padding: 40rpx 20rpx 0 20rpx;
	}

	.intro {
		margin-bottom: 80rpx;
	}

	.intro-title {
		font-size: 28rpx;
		color: #333333;
		margin-bottom: 40rpx;
	}

	.intro-btn {
		display: flex;
		justify-content: center;
	}

	.btn-start {
		background-color: #333333;
		color: #ffffff;
		border-radius: 40rpx;
		padding: 20rpx 40rpx;
		font-size: 32rpx;
		font-weight: bold;
	}

	.features {
		display: flex;
		justify-content: space-around;
	}

	.feature-item {
		width: 70%;
		background-color: #ffffff;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 14rpx rgba(0, 0, 0, 0.04);
		border-radius: 10rpx;
		padding: 20rpx;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		cursor: pointer;
	}

	.feature-icon {
		height: 80rpx;
		width: 80rpx;
		margin-bottom: 20rpx;
	}

	.feature-title {
		font-size: 32rpx;
		color: #333333;
		font-weight: bold;
		margin-bottom: 10rpx;
	}

	.feature-desc {
		font-size: 24rpx;
		color: #999999;
		text-align: center;
	}
</style>