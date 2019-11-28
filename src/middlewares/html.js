function html() {
	return async (_, next) => {
		const response = await next({ headers: { Accept: `text/html` } })
		const data = await response.text()
		return data
	}
}

export default html