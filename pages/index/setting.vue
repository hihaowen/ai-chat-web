<template>
	<view v-if="refresh" class="uni-container">
		<view v-if="!hasLogin" class="uni-header-logo">
			<image class="uni-header-image avatar" src="/static/user.jpg" @click="bindLogin"
				:style="{'cursor': 'pointer'}">
			</image>
			<text class="hello-text">{{$t('template.clickAvatar')}}</text>
		</view>

		<view v-else class="uni-header-logo">
			<image class="uni-header-image avatar" src="/static/user.jpg"></image>
			<text class="hello-text">{{uerInfo.nickname}}</text>
		</view>

		<view class="uni-panel" v-if="uerInfo.grantModelList && uerInfo.grantModelList.length > 0">
			<div class="section">
				<h1 class="section-title">{{$t('template.remainingCatFood')}}</h1>
				<ul class="list">
					<li class="list-item" v-for="(item, index) in uerInfo.grantModelList" :key="index">
						<div v-if="item.tag === 'GPT-4'" class="thumb" :style="{ backgroundColor: 'black'}">
							<img src="/static/openai-white-logomark.png" />
						</div>
						<div v-else-if="item.tag === 'GPT-3.5'" class="thumb"
							:style="{ backgroundColor: 'rgb(16, 163, 127)'}">
							<img src="/static/openai-white-logomark.png" />
						</div>
						<div v-else-if="item.tag === 'Bing'" class="thumb">
							<img src="/static/bing.png" />
						</div>
						<div v-else class="thumb"></div>
						<div class="item-content">
							<h2 class="item-title">{{ item.tag }}</h2>
							<p class="item-note">{{ item.balance }} {{$t('template.grains')}}</p>
						</div>
					</li>
				</ul>
			</div>
		</view>

		<view v-if="hasLogin" class="uni-panel">
			<navigator url="/pages/sso/member" hover-class="navigator-hover">
				<button type="primary">{{$t('template.buyCatFood')}}</button>
			</navigator>
		</view>

		<view class="uni-panel">
			<div class="section">
				<h1 class="section-title">{{$t('common.language')}}</h1>
				<uni-data-select style="min-width: 120px;" v-model="applicationLocale" :localdata="locales"
					@change="onLocaleChange" :clear="false">
				</uni-data-select>
			</div>
		</view>

		<view class="uni-panel">
			<p><uni-link href="/pages/common/privacy" :text="$t('data.privacyPolicy')"></uni-link></p>
			<p><uni-link href="/pages/common/terms" :text="$t('data.termsOfUse')"></uni-link></p>
			<p><uni-link href="https://tally.so/r/mRdPaK" :text="$t('data.feedback')"></uni-link></p>
		</view>

		<view class="page">
			<button v-if="hasLogin" type="warn" @click="bindLogin">{{$t('template.logout')}}</button>
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
		getAccessToken,
		userInfoHandler
	} from '../../common/sso.js'
	import {
		nextTick
	} from "vue";

	export default {
		computed: {
			...mapState(['hasLogin', 'uerInfo']),
			locales() {
				return [{
						text: this.$t('locale.auto'),
						value: 'auto'
					}, {
						text: this.$t('locale.en'),
						value: 'en'
					},
					{
						text: this.$t('locale.zh-hans'),
						value: 'zh-Hans'
					},
				]
			},
		},
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
				applicationLocale: '',
				refresh: true,
				hideList: [
					'ucharts',
					'nav-city-dropdown'
				],
				grantModelList: [],
				list: [],
			}
		},
		onShow() {
			console.log("重新加载用户信息")
			this.reload()
		},
		onHide() {

		},
		onLoad() {
			this.applicationLocale = uni.getLocale();
			uni.onLocaleChange((e) => {
				this.applicationLocale = e.locale;
			})
		},
		watch: {

		},
		methods: {
			...mapMutations(['login']),
			onLocaleChange(l) {
				console.log("选择语言:", l)
				uni.setLocale(l);
				this.$i18n.locale = l;
			},
			reload() {
				// 更新登录用户信息
				userInfoHandler(window.location.href,
					(result) => {
						this.login(result.data)
						// 移除组件
						this.refresh = false
						// 在组件移除后，重新渲染组件
						this.$nextTick(function() {
							this.refresh = true
						})
					})
			},
			bindLogin() {
				if (this.hasLogin) {
					uni.navigateTo({
						url: '/pages/sso/logout?is_tab=true&redirect_url=/' + encodeURIComponent(this.$mp.page
							.route)
					})
				} else {
					uni.navigateTo({
						url: '/pages/sso/login?is_tab=true&redirect_url=/' + encodeURIComponent(this.$mp.page
							.route)
					})
				}
			},
		}
	}
</script>

<style>
	@import '../../common/uni-nvue.css';

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
	}
</style>
<style scoped>
	.section-title {
		font-size: 16px;
		color: #333;
	}

	.list {
		padding: 0;
		list-style: none;
	}

	.list-item {
		display: flex;
		align-items: center;
		padding: 15px;
		border-bottom: 1px solid #ddd;
	}

	.thumb {
		width: 60px;
		/* 调整为你需要的大小 */
		height: 60px;
		/* 调整为你需要的大小 */
		margin-right: 20px;
		/* 右边距，根据需要调整 */
		border-radius: 10px;
		/* 添加圆角 */
		overflow: hidden;
		/* 确保图片不超出边界 */
	}

	.thumb img {
		width: 100%;
		height: 100%;
	}

	.item-content {
		flex-grow: 1;
		/* 使内容占据剩余空间 */
	}

	.item-title {
		font-size: 18px;
		color: #333;
		margin-bottom: 5px;
	}

	.item-note {
		font-size: 14px;
		color: #999;
	}
</style>