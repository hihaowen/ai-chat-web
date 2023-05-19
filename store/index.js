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
		sessions: [],
		activeSessionId: null,
	},
	mutations: {
		login(state, provider) {
			// 用户信息
			if (typeof provider.login_uid != "undefined") {
				state.uerInfo.nickname = provider.login_nickname;
				state.uerInfo.isMember = provider.is_member;
				state.uerInfo.memberExpireAt = provider.member_expire_at;
				state.uerInfo.grantModelList = provider.chat_model_list;
				state.hasLogin = true;
			} else {
				state.uerInfo = {};
				state.hasLogin = false;
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
			
			console.log("最新userInfo:", state.uerInfo)
		},
		logout(state) {
			state.uerInfo = {};
			state.hasLogin = false;
		},
		createSession(state, title) {
			const newSessionId = generateUUID();
			state.sessions.push({id: newSessionId, title: title});
			state.activeSessionId = newSessionId;
			// Store to local storage
			localStorage.setItem('sessions', JSON.stringify(state.sessions));
			localStorage.setItem('activeSessionId', JSON.stringify(state.activeSessionId));
		},
		switchSession(state, sessionId) {
			console.log("切换到会话:"+sessionId)
			state.activeSessionId = sessionId;
			// Store to local storage
			localStorage.setItem('activeSessionId', JSON.stringify(state.activeSessionId));
		},
		editSessionTitle(state, { sessionId, newTitle }) {
			const session = state.sessions.find(session => session.id === sessionId);
			if (session) {
				session.title = newTitle;
	
				// Update the sessions in local storage
				localStorage.setItem('sessions', JSON.stringify(state.sessions));
			}
		},
		deleteSession(state, sessionId) {
		    if (state.sessions.length > 1) {
		        const sessionIndex = state.sessions.findIndex(session => session.id === sessionId);
		        if (sessionIndex !== -1) {
		            // Remove the session
		            state.sessions.splice(sessionIndex, 1);
		            
		            // Remove the corresponding chatList from localStorage
		            localStorage.removeItem(`chatList-${sessionId}`);
		            
		            // If the deleted session was the active session, switch to the first session in the array
		            if (state.activeSessionId === sessionId) {
		                state.activeSessionId = state.sessions[0].id;
		            }
		        }
		    } else {
		        alert("You can't delete all the sessions.");
		    }
		    
		    // Update the sessions and activeSessionId in local storage
		    localStorage.setItem('sessions', JSON.stringify(state.sessions));
		    localStorage.setItem('activeSessionId', JSON.stringify(state.activeSessionId));
		},
	}
})

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Initialize sessions and activeSessionId if they're not set yet (for a new user)
if (localStorage.getItem('sessions') === null || localStorage.getItem('activeSessionId') === null) {
	store.commit('createSession', 'New Chat');
} else {
	// For returning users, get the data from localStorage
	store.state.sessions = JSON.parse(localStorage.getItem('sessions'));
	store.state.activeSessionId = JSON.parse(localStorage.getItem('activeSessionId'));
}

export default store
