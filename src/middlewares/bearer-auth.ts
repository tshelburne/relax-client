import {Middleware} from '../client'

interface Store {
	read: (k: string) => Promise<string | null>
	write: (k: string, v: string, o?: any) => Promise<any>
}

const memory: Record<string, any> = {}
const stores: Record<'cookie' | 'localstorage' | 'memory', Store> = {
	cookie: {
		read: async (k) => {
			const res = document.cookie.match(new RegExp(`${k}=([^;]*)`))
			return res ? res[1] : null
		},
		write: async (k, v, o) => {
			const allowedParams = [`domain`]
			const options = Object.entries(o)
				.filter(([ok]) => allowedParams.includes(ok))
				.map(([ok, ov]) => `${ok}=${ov};`)
			document.cookie = `${k}=${v};${options.join('')}`
		}
	},
	localstorage: {
		read: async (k) => localStorage.getItem(k),
		write: async (k, v) => localStorage.setItem(k, v),
	},
	memory: {
		read: async (k) => memory[k],
		write: async (k, v) => memory[k] = v,
	}
}

interface Opts {
	header?: string
	store?: keyof typeof stores | Store
	options?: {}
}
function bearerAuth(tokenKey: string, {header = 'Authorization', store = 'localstorage', options = {}}: Opts = {}): Middleware<Response, Response> {
	return async (_, next) => {
		const {read, write} = isStore(store) ? store : stores[store]

		const token = await read(tokenKey)
		const response = await next({
			credentials: `include`,
			headers: {
				[header]: token ? `Bearer ${token}` : ``,
			}
		})

		if (response.headers.has(header)) {
			await write(tokenKey, response.headers.get(header) as string, options)
		}

		return response
	}
}

bearerAuth.ALL_SUBDOMAINS = 'cookie'
bearerAuth.THIS_SUBDOMAIN = 'localstorage'
bearerAuth.THIS_SESSION = 'memory'

export default bearerAuth

function isStore(v: Opts['store']): v is Store {
	return typeof v === 'object'
}