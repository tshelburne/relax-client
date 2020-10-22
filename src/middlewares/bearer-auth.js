import cookies from 'cookie'

function bearerAuth(tokenKey, strategy = 'localstorage') {
	return async ({cookie = ''}, next) => {
		let read, write

		if (typeof strategy === 'object') {
			read = strategy.read
			write = strategy.write
		} else {
			switch (strategy) {
				case 'cookie':
					read = (key) => cookies.parse(cookie)[key]
					write = cookies.serialize
					break

				case 'localstorage':
				default:
					read = localStorage.getItem
					write = localStorage.setItem
					break
			}
		}

		const token = read(tokenKey)
		const response = await next({
			credentials: `include`,
			headers: {
				Authorization: token ? `Bearer ${token}` : ``,
			}
		})

		if (response.headers.has(`Authorization`)) {
			if (strategy === 'cookie') {
				response.headers['Set-Cookie'] = write(tokenKey, response.headers.get(`Authorization`))
			} else {
				write(tokenKey, response.headers.get(`Authorization`))
			}
		}

		return response
	}
}

export default bearerAuth