import type {Middleware} from '../client'

function json(): Middleware<object> {
	return async (_, next) => {
		const response = await next({
			headers: {
				'Content-Type': `application/json`,
				Accept: `application/json`,
			}
		})
		return response.status === 204 ? {} : response.json()
	}
}

export default json