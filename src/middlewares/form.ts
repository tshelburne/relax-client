import {Middleware} from '../client.ts'

function form(): Middleware {
	return ({method, body}, next) => {
		if (![`post`, `put`].includes(method)) return next()

		const data = JSON.parse(body)

		const formBody = new FormData()
		for (let k in data) {
			formBody.append(k, data[k])
		}

		return next({
			body: formBody,
			headers: {
				'Content-Type': `multipart/form-data`,
			}
		})
	}
}

export default form