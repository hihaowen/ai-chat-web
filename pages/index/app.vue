<template>
	<view>
		<uni-section title="常用工具" type="line" padding>
			<uni-grid :column="3" :highlight="true">
				<uni-grid-item v-for="(item, index) in list" :index="index" :key="index">
					<view class="grid-item-box" @click="jumpFormChat(item.id)">
						<text class="text">{{ item.name }}</text>
					</view>
				</uni-grid-item>
			</uni-grid>
		</uni-section>
	</view>
</template>

<script>
	import {
		chatApi
	} from '../../package.json'

	export default {
		data() {
			return {
				title: 'Hello',
				list: {}, // 从 API 获取的列表数据
			}
		},
		onLoad() {
			this.fetchForm();
		},
		methods: {
			async fetchForm() {
				const res = await uni.request({
					url: chatApi + `/chat/list`,
					method: "GET",
				});
				this.list = res.data.data.list;
				this.initFormData();
			},
			initFormData() {

			},
			jumpFormChat(formId) {
				uni.navigateTo({
					url: `/pages/chat/form?form=${formId}`
				})
			},
		}
	}
</script>

<style lang="scss">
	.image {
		width: 25px;
		height: 25px;
	}

	.text {
		font-size: 14px;
		margin-top: 5px;
	}

	.grid-dynamic-box {
		margin-bottom: 15px;
	}

	.grid-item-box {
		flex: 1;
		// position: relative;
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 15px 0;
	}

	.grid-item-box-row {
		flex: 1;
		// position: relative;
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		flex-direction: row;
		align-items: center;
		justify-content: center;
		padding: 15px 0;
	}

	.grid-dot {
		position: absolute;
		top: 5px;
		right: 15px;
	}

	.swiper {
		height: 420px;
	}

	/* #ifdef H5 */
	@media screen and (min-width: 768px) and (max-width: 1425px) {
		.swiper {
			height: 630px;
		}
	}

	@media screen and (min-width: 1425px) {
		.swiper {
			height: 830px;
		}
	}

	/* #endif */
</style>