const fs = require("fs");
const { program } = require("commander");
const OSRM = require("osrm-rest-client").OSRM;
const driveTime = require("./driveTime");
const Koa = require("koa");
const cors = require("@koa/cors");

const commaSeparatedList = (value) => value.split(",").map((n) => +n);

const parseQueryParams = (str) => {
  const result = {};
  const regex = /(?:\?|\&)([^=]+)\=([^&]+)/gm;
  let m;

  while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    result[m[1]] = m[2];
  }
  return result;
};

program
  .version("0.1.0")
  .name("howfar")
  .description(
    `Returns a GeoJSON file indicating how far you can travel starting at the provided coordinates. 
    You can use it as a REST service when no coordinates are supplied, or as a command by supplying them.
    In case you use it as a service, query it using http://localhost:PORT/lat/lon/bands
    (where /bands is optional). For example, when the service is running on port 3000, use
    http://localhost:3000/52.373083994540266/4.891233444213867?distance=15&bands=5&detail=3`
  )
  .option(
    "-c, --coordinates <lat, lon>",
    'Start coordinate as "lon, lat"',
    commaSeparatedList
  )
  .option("-d, --distance <values>", "Max distance in minutes", parseFloat, 15)
  .option(
    "-p, --port <number>",
    "Port to use for exposing a REST endpoint, e.g. http://localhost:PORT/lat/lon"
  )
  .option(
    "-t, --profile <profile>",
    "Transport type, can be car, bike or foot",
    "car"
  )
  .option("-n, --serviceProvider <provider>", "Link to the OSRM provider")
  .option(
    "-o, --output",
    "Output file, if provided. Otherwise output will be send to stdout."
  );

program.parse();
// console.log(program.opts());

const {
  port,
  coordinates,
  distance,
  output,
  profile,
  serviceProvider,
} = program;
const defaultProfile = profile === "car" ? "driving" : profile;

const osrm = OSRM({ osrm: serviceProvider, defaultProfile });

const maxKmh = profile === "car" ? 100 : profile === "bike" ? 30 : 10;

if (coordinates) {
  const maxDistanceInKm = (maxKmh / 60) * distance;
  driveTime(coordinates, osrm, distance * 60, maxDistanceInKm)
    .then((result) => {
      fs.writeFileSync(output, JSON.stringify(result.iso));
    })
    .catch(console.error);
} else if (port) {
  const regex = /\/([\d.]*)\/([\d.]*)/;

  const app = new Koa();
  app.use(cors());
  app.use(async (ctx) => {
    const match = regex.exec(ctx.url);
    if (match && match.length >= 3) {
      const lat = +match[1];
      const lon = +match[2];

      const params = parseQueryParams(ctx.url);
      const minutes = +params.distance || distance;
      const bands = +params.bands || 3;
      const detail = +params.detail || 3;
      const maxDistanceInKm = (maxKmh / 60) * minutes;
      console.log(
        `Requesting ${bands} isochrone(s) for (${lat}, ${lon}), estimated reach in ${minutes} minutes = ${maxDistanceInKm} km`
      );

      const result = await driveTime(
        [lon, lat],
        osrm,
        minutes * 60,
        maxDistanceInKm,
        detail,
        bands
      );
      ctx.body = result.iso;
      // ctx.body = result.circlePoints;
      // ctx.body = result.samplePoints;
      // ctx.body = result.tin;
    } else {
      ctx.body = `Howfar REST service usage: http://localhost:${port}/lat/lon`;
    }
  });

  app.listen(port, () =>
    console.log(`REST service is listening on port ${port}.`)
  );
} else {
  program.help();
}
