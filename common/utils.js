// 防抖动
export const debounce = (func, delay = 1000, immediate = false) => {
	let timer = null

	if (timer) {
		clearTimeout(timer)
	}
	if (immediate && !timer) {
		func.apply(this, arguments)
	}
	timer = setTimeout(() => {
		func.apply(this, arguments)
	}, delay)
}