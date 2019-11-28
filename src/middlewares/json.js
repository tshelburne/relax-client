function json() {
	return async (_, next) => {
		const response = await next({
			headers: {
				'Content-Type': `application/json`,
				Accept: `application/json`,
			}
		})
		const data = await response.json()
		return data
	}
}

export default json