import jsdom from 'jsdom-global'

before(function() {
    this.jsdom =  new jsdom(``, {
        url: "https://test.com/",
    })
})

after(function() {
    this.jsdom = jsdom
})
