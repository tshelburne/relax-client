import pako from 'pako'

function gzip() {
	return ({body}, next) => {
		const compressed = pako.gzip(body, {to: 'string'})
		return next({ body: compressed, headers: { 'Content-Encoding': `gzip` } })
	}
}

export default gzip