function blob() {
	return async (_, next) => {
		const response = await next({ headers: { Accept: `*/*` } })
		const data = await response.blob()
		return data
	}
}

export default blob