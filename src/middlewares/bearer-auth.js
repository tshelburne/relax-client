function bearerAuth(tokenKey) {
	return async (_, next) => {
		const token = localStorage.getItem(tokenKey)
		const response = await next({
			credentials: `include`,
			headers: {
				Authorization: token ? `Bearer ${token}` : ``,
			}
		})

		if (response.headers.has(`Authorization`)) {
			localStorage.setItem(tokenKey, response.headers.get(`Authorization`))
		}

		return response
	}
}

export default bearerAuth