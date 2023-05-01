<template>
	<view class="uni-container">
		<view v-if="!hasLeftWin" class="uni-header-logo">
			<view v-if="!hasLogin">
				<image class="uni-header-image" src="/static/user.jpg" @click="bindLogin"
					:style="{'cursor': 'pointer'}"></image>
				<view>点击头像登录</view>
			</view>
			<view v-else>
				<image class="uni-header-image" src="/static/user.jpg"></image>
			</view>
		</view>
		<view v-if="!hasLeftWin" class="uni-panel">
			<text class="hello-text">免费用户目前只能白嫖GPT-3.5模型,每天有次数限制\n付费用户没有任何限制,而且可以使用目前最强大的Ai模型GPT-4</text>
		</view>
		<view class="uni-panel">
			<navigator url="/pages/member/index" hover-class="navigator-hover">
				<button type="primary" v-if="!uerInfo.isMember">开通会员</button>
				<button type="primary" v-else>续费({{uerInfo.memberExpireAt}})</button>
			</navigator>
		</view>
		<view class="uni-panel">
			<uni-section title="选择模型" type="line">
				<view class="uni-px-5 uni-pb-5">
					<uni-data-select v-model="currentSelectedModel" :localdata="modelList" @change="switchModel"
						:clear="false"></uni-data-select>
				</view>
			</uni-section>
		</view>
		<view :class="{'pc-hide': hideList.indexOf(item.url) !== -1  && hasLeftWin}" class="uni-panel"
			v-for="(item, index) in list" :key="item.id">
			<view :class="{'left-win-active': leftWinActive === item.url  && hasLeftWin, 'uni-panel-h-on': item.open}"
				class="uni-panel-h" @click="triggerCollapse(index, item.id)">
				<text class="uni-panel-text">{{item.name}}</text>
				<text class="uni-panel-icon uni-icon"
					:class="item.open  ? 'uni-panel-icon-on' : ''">{{item.pages ? '&#xe581;' : '&#xe470;'}}</text>
			</view>
			<view class="uni-panel-c" v-if="item.open">
				<view
					:class="{'left-win-active': leftWinActive === item2.url  && hasLeftWin, 'pc-hide': hideList.indexOf(item2.url) !== -1  && hasLeftWin}"
					class="uni-navigate-item" v-for="(item2,key) in item.pages" :key="key" @click="goDetailPage(item2)">
					<text class="uni-navigate-text">{{item2.name ? item2.name : item2}}</text>
					<text class="uni-navigate-icon uni-icon">&#xe470;</text>
				</view>
			</view>
		</view>
		<view class="page">
			<button v-if="hasLogin" type="warn" @click="bindLogin">退出登录</button>
		</view>
	</view>
</template>
<script>
	import {
		chatApi
	} from '../../package.json'

	import {
		mapState,
		mapMutations
	} from 'vuex';

	import {
		clearLoginInfo,
		getAccessToken
	} from '../../common/sso.js'

	export default {
		computed: mapState(['hasLogin', 'uerInfo', 'logoutUrl']),
		props: {
			hasLeftWin: {
				type: Boolean
			},
			leftWinActive: {
				type: String
			}
		},
		data() {
			return {
				hideList: [
					'ucharts',
					'nav-city-dropdown'
				],
				modelList: [],
				currentSelectedModel: 'gpt-3.5-turbo',
				lastSelectedModel: '',
				list: [{
						id: 'navbar',
						name: '隐私条款',
						open: false,
						pages: [{
								name: '隐私协议',
								url: '/pages/common/privacy'
							},
							{
								name: '使用条款',
								url: '/pages/common/terms'
							}
						]
					},
					{
						name: '问题反馈',
						url: 'https://github.com/hihaowen/ai-chat-web/issues',
					},
				]
			}
		},
		onLoad() {
			this.initModel()
		},
		watch: {
			$route: {
				immediate: true,
				handler(newRoute) {
					if (newRoute.matched.length) {
						let path = newRoute.path.split('/')[3]
						for (const item of this.list) {
							if (Array.isArray(item.pages)) {
								for (const page of item.pages) {
									if (page === path || page.url && page.url === path) {
										item.open = true
									}
								}
							}
						}
					}
				}
			}
		},
		methods: {
			...mapMutations(['logout']),
			async initModel() {
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

				const currentSelectedModel = await uni.request({
					url: chatApi + `/user_config/chat_model`,
					method: "GET",
					header: {
						"Authorization": getAccessToken(),
					},
				});
				if (typeof currentSelectedModel.data.data === 'string') {
					this.currentSelectedModel = currentSelectedModel.data.data;
					this.lastSelectedModel = this.currentSelectedModel;
					console.log("当前选择的model:", this.currentSelectedModel)
				}
			},
			switchModel(model) {
				let currentSelectedModel = model;

				let msg = "模型切换失败"
				uni.request({
					url: chatApi + `/user_config/switch_model`,
					method: "POST",
					header: {
						"Authorization": getAccessToken(),
					},
					data: {
						model: currentSelectedModel,
					},
					timeout: 5000,
					dataType: "json",
					success: (result) => {
						if (result.statusCode === 200) {
							console.log("模型切换成功:", currentSelectedModel);

							this.lastSelectedModel = this.currentSelectedModel
							this.currentSelectedModel = currentSelectedModel

							uni.showToast({
								title: "模型切换成功",
								icon: 'none'
							});
						} else if (result.statusCode === 401) {
							msg = '未登录或登录失效'
							uni.showToast({
								title: msg,
								icon: "none",
								complete: () => {
									this.$nextTick(() => {
										console.log("切换为上一次选中模型:", this.lastSelectedModel)
										this.currentSelectedModel = this.lastSelectedModel;

										setTimeout(function() {
											uni.navigateTo({
												url: '/pages/sso/login?is_tab=true&redirect_url=/' +
													encodeURIComponent(this
														.$mp.page.route)
											})
										}, 1500)
									});
								},
							});
							console.error("模型切换失败:", result.data.error)
						} else if (result.statusCode === 426) {
							msg = '只有会员才能使用该模型'
							uni.showToast({
								title: msg,
								icon: "none",
								complete: () => {
									this.$nextTick(() => {
										console.log("切换为上一次选中模型:", this.lastSelectedModel)
										this.currentSelectedModel = this.lastSelectedModel;

										setTimeout(function() {
											uni.navigateTo({
												url: '/pages/member/index'
											})
										}, 1500)
									});
								},
							});
							console.error("模型切换失败:", result.data.error)
						} else {
							uni.showToast({
								title: msg,
								icon: 'none',
								complete: () => {
									this.$nextTick(() => {
										console.log("切换为上一次选中模型:", this.lastSelectedModel)
										this.currentSelectedModel = this.lastSelectedModel;
									});
								},
							});
						}
					},
					fail: (e) => {
						uni.showToast({
							title: msg,
							icon: 'none',
							complete: () => {
								this.$nextTick(() => {
									console.log("切换为上一次选中模型:", this.lastSelectedModel)
									this.currentSelectedModel = this.lastSelectedModel;
								});
							},
						});
						console.error("模型切换失败:", e.data.error)
					},
					complete: () => {

					}
				})
			},
			bindLogin() {
				if (this.hasLogin) {
					this.logout()
					clearLoginInfo()
					// 去SSO退出
					// TODO 目前先只兼顾H5
					self.location.href = this.logoutUrl
				} else {
					uni.navigateTo({
						url: '/pages/sso/login?is_tab=true&redirect_url=/' + encodeURIComponent(this.$mp.page
							.route)
					})
				}
			},
			triggerCollapse(e, id) {
				if (!this.list[e].pages) {
					this.goDetailPage(this.list[e].url);
					return;
				}
				for (var i = 0; i < this.list.length; ++i) {
					if (e === i) {
						this.list[i].open = !this.list[i].open;
					} else {
						this.list[i].open = false;
					}
				}
			},
			goDetailPage(e) {
				let path = e.url ? e.url : e;
				let url = path;
				if (this.hasLeftWin) {
					uni.reLaunch({
						url: url
					})
				} else if (url.startsWith('http')) {
					window.open(url)
				} else {
					uni.navigateTo({
						url: url
					})
				}
				return false;
			}
		}
	}
</script>

<style>
	@import '../../common/uni-nvue.css';
</style>