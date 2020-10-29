const stores = {
	cookie: {
		read: (k) => {
			const res = document.cookie.match(new RegExp(`${k}=([^;]*)`))
			return res ? res[1] : null
		},
		write: (k, v, o) => {
			const options = Object.entries(o).map(([ok, ov]) => `${ok}=${ov};`)
			return document.cookie = `${k}=${v};${options.join('')}`
		},
	},
	localstorage: {
		read: (k) => localStorage.getItem(k),
		write: (k, v) => localStorage.setItem(k, v),
	},
	memory: {
		_store: {},
		read: (k) => stores.memory._store[k],
		write: (k, v) => stores.memory._store[k] = v,
	}
}

function bearerAuth(tokenKey, {header = 'Authorization', store = 'localstorage', options = {}} = {}) {
	return async (_, next) => {
		const {read, write} = typeof store === 'object' ? store : stores[store]

		const token = await read(tokenKey)
		const response = await next({
			credentials: `include`,
			headers: {
				[header]: token ? `Bearer ${token}` : ``,
			}
		})

		if (response.headers.has(header)) {
			await write(tokenKey, response.headers.get(header), options)
		}

		return response
	}
}

bearerAuth.ALL_SUBDOMAINS = 'cookie'
bearerAuth.THIS_SUBDOMAIN = 'localstorage'
bearerAuth.THIS_SESSION = 'memory'

export default bearerAuth