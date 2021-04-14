import pako from 'pako'
import {Middleware} from '../client.ts'

function gzip(): Middleware {
	return ({body}, next) => {
		const compressed = pako.gzip(body, {to: 'string'})
		return next({ body: compressed, headers: { 'Content-Encoding': `gzip` } })
	}
}

export default gzip