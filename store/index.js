// #ifndef VUE3
import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)
const store = new Vuex.Store({
// #endif

// #ifdef VUE3
import { createStore } from 'vuex'
const store = createStore({
// #endif
	state: {
		uerInfo: {},
		hasLogin: false,
		loginUrl: "",
		logoutUrl: "",
		ssoServerUrl: "",
	},
	mutations: {
		login(state, provider) {
			// 用户信息
			if (typeof provider.nickname != "undefined") {
				state.uerInfo.nickname = provider.nickname;
				state.uerInfo.isMember = provider.is_member;
				state.uerInfo.memberExpireAt = provider.member_expire_at;
				// 登录状态
				state.hasLogin = true;
			}
			
			// 系统参数
			if (typeof provider.login_url != "undefined") {
				state.loginUrl = provider.login_url
			}
			if (typeof provider.logout_url != "undefined") {
				state.logoutUrl = provider.logout_url
			}
			if (typeof provider.sso_server_url != "undefined") {
				state.ssoServerUrl = provider.sso_server_url
			}
		},
		logout(state) {
			state.hasLogin = false;
			state.uerInfo = {};
		}
	}
})

export default store
