import {Middleware} from '../client'

function html(): Middleware<string> {
	return async (_, next) => {
		const response = await next({ headers: { Accept: `text/html` } })
		return response.status === 204 ? `` : response.text()
	}
}

export default html