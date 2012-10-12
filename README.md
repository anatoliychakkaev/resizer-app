## Usage

    node server.js

then open
`http://localhost:3000/?u=http://www.google.com/images/srpr/logo3w.png&w=300&h=100` in browser

Request params:

- u - url of image
- w - width (positive integer)
- h - heigth (positive integer)
- gravity - gravity param for imagemagick (optional)

## Tests

    npm test

Test coverage report available in `./coverage/index.html`

## Documentation

    make doc

Available online: [jsdoc.info](http://jsdoc.info/anatoliychakkaev/resizer-app)

## License

BSD

