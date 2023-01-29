import type {Middleware} from '../middleware'

type JSON = string | number | boolean | null | JSON[] | { [key: string]: JSON }

function json(): Middleware<Response, JSON> {
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