<template>
	<uni-data-select v-model="currentSelectedModel" :localdata="modelList" @change="switchModel" :clear="false">
	</uni-data-select>
</template>

<style>

</style>

<script>
	import {
		chatApi
	} from '../package.json'

	export default {
		data() {
			return {
				modelList: [],
				currentSelectedModel: "",
			}
		},
		watch: {
			currentSelectedModel(newVal, oldVal) {
				this.$emit('model-change', newVal);
			}
		},
		mounted() {
			// 初始化模型
			this.initModel()

			// 当前选择的模型
			this.currentSelectedModel = localStorage.getItem('currentSelectedModel');
		},
		methods: {
			switchModel(model) {
				this.currentSelectedModel = model;
				localStorage.setItem('currentSelectedModel', this.currentSelectedModel);
				console.log("用户切换聊天模型:", this.currentSelectedModel)
			},
			async initModel() {
				// 可选model列表
				const modelSupported = await uni.request({
					url: chatApi + `/chat_model`,
					method: "GET",
				});
				this.modelList = modelSupported.data.data.map(function(option) {
					return {
						value: option.model,
						text: option.model,
					}
				});

				console.log("全部模型:", this.modelList)

				if (typeof this.currentSelectedModel === 'string') {
					console.log("当前选择的model:", this.currentSelectedModel)
				}
			},
		},
	};
</script>