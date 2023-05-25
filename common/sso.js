import {
	chatApi
} from '../package.json'

export const getAccessToken = () => {
	// return localStorage.getItem("access_token");
	return uni.getStorageSync("access_token");
}

export const clearLoginInfo = () => {
	// localStorage.clear();
	try {
		uni.removeStorageSync('login_nickname');
		uni.removeStorageSync('access_token');
		uni.removeStorageSync('refresh_token');
	} catch (e) {
		// error
	}
}

export const saveLoginInfo = (data) => {
	if (typeof data.login_nickname != "undefined") {
		// localStorage.setItem("login_nickname", data.login_nickname);
		uni.setStorageSync('login_nickname', data.login_nickname);
	}
	if (typeof data.access_token != "undefined") {
		// localStorage.setItem("access_token", data.access_token);
		uni.setStorageSync('access_token', data.access_token);
	}
	if (typeof data.refresh_token != "undefined") {
		// localStorage.setItem("refresh_token", data.refresh_token);
		uni.setStorageSync('refresh_token', data.refresh_token);
	}
}

export const userInfoHandler = (redirectUrl, resultFunc) => {
	request(
		"GET",
		"/v1/sso/api/user?redirect_url=" + encodeURIComponent(redirectUrl), {},
		function(result) {
			if (resultFunc) resultFunc(result);
		}
	);
}

export const checkCodeProcess = (code, resultFunc) => {
	if (code == "") {
		alert("code不能為空");
		return;
	}

	return request("GET",
		"/v1/sso/api/checkcode", {
			code: code
		},
		function(result) {
			if (resultFunc) resultFunc(result);
		}
	);
}

function request(method, api, params, resultFunc, completeFunc) {
	uni.request({
		url: chatApi + api,
		data: params,
		dataType: 'json',
		header: {
			'Authorization': getAccessToken()
		},
		success: (result) => {
			console.log("請求成功: " + api);
			if (resultFunc) resultFunc(result.data);
		},
		complete: () => {
			if (completeFunc) completeFunc();
		}
	});
}