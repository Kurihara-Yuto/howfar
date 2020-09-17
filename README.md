# Howfar

Create GeoJSON isochrone contours based on how far you can drive, cycle or walk in an interval based on the [Open Source Routing Machine (OSRM)](https://project-osrm.org).

Although there are multiple npm packages that provide a similar service, e.g. [isochrone](https://www.npmjs.com/package/isochrone) and [galton](https://www.npmjs.com/package/galton), this one uses an OSRM REST source instead of the alternatives, which rely on node bindings. Although node bindings are probably more performant, they are notoriously difficult to install on Windows, since `node-gyp` sucks and the latest binaries were released for node 8. Also it is quite a pain if you first need to create the required OSRM graph in order to run it a few times. Therefore, this version uses the public OSRM service, which should be fine for a few queries, but you can specify your own OSRM service too if you need to resolve many locations.

While implementing the previously mentioned methods, I noticed that the quality was not very good: it requires a lot of tweaking of specific parameters in order to get acceptable results. Furthermore, they create a rectangular grid around the desired location, which does not make sense as most isochrones will more likely be round. Further investigations lead to the work of [geolytix](https://medium.com/geolytix/creating-isochrone-catchments-from-a-distance-matrix-15f39e436d09), and that version is implemented here. Another interesting read is [Peter Liu's](https://blog.mapbox.com/add-isochrones-to-your-next-application-e9e84a62345f) explanation of the MapBox implementation.

```bash
Usage: howfar [options]

Returns a GeoJSON file indicating how far you can travel starting at the provided coordinates.
    You can use it as a REST service when no coordinates are supplied, or as a command by supplying them.
    In case you use it as a service, query it using http://localhost:PORT/lat/lon/bands
    (where /bands is optional). For example, when the service is running on port 3000, use
    http://localhost:3000/52.373083994540266/4.891233444213867?distance=15&bands=5&detail=3

Options:
  -V, --version                     output the version number
  -c, --coordinates <lat, lon>      Start coordinate as "lon, lat"
  -d, --distance <values>           Max distance in minutes (default: 15)
  -p, --port <number>               Port to use for exposing a REST endpoint, e.g. http://localhost:PORT/lat/lon
  -t, --profile <profile>           Transport type, can be car, bike or foot (default: "car")
  -n, --serviceProvider <provider>  Link to the OSRM provider
  -o, --output                      Output file, if provided. Otherwise output will be send to stdout.
  -h, --help                        display help for command
```

## Development

```bash
npm i
npm run nodemon
```

## Installation

```bash
npm i -g howfar
```

## Usage

Sometimes you need to estimate how far you can get in a certain interval, and you want to display this as a GeoJSON file. For a simple case, you can just run the command line version to convert a starting coordinate to an isochrone, e.g.

```bash
howfar -c "5.5, 51.5" -o isochrone.geojson
```

In case you want to run it as a service, you can provide a port too. To see more options, use `howfar -h`.

```bash
howfar -p 3000
```

Alternatively, if you need to perform many queries, start a local OSRM service, and use that:

```bash
howfar -p 3000 -n http://127.0.0.1:5000
```

To run your own service, see the [Project OSRM backend service](https://github.com/Project-OSRM/osrm-backend) or [here](https://github.com/erikvullings/agent-smith/tree/master/packages/osrm-services).
