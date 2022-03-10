import { Router } from "express";
import { json } from "body-parser";
import path from "path";
import { glob } from "glob";
import ConfigError from "./errors/ConfigError";
import { handler, middleware } from "./utils/wrap";
import swaggerUi from "swagger-ui-express";
import fs, { cpSync } from "fs";

const autoExpress = () => {
	const router = Router().use(json());

	router.swagger = {
		swagger: "2.0",
		host: "TODO",
		basePath: "/",
		info: {},
		consumes: ["application/json"],
		produces: ["application/json"],
		paths: {},
	};

	router.swaggerInfo = ({
		swagger,
		host,
		basePath,
		info,
		consumes,
		produces,
		securityDefinitions,
		definitions,
	}) => {
		router.swagger = {
			swagger,
			host,
			basePath,
			info,
			consumes,
			produces,
			securityDefinitions,
			definitions,
			paths: {},
		};
		return router;
	};

	router.loadApiDir = (apiDirname) => {
		const apiPaths = glob.sync(
			path.join(__dirname, `${apiDirname}/**/*.js`),
			{
				absolute: true,
				ignore: path.join(
					__dirname,
					`${apiDirname}/**/middlewares/*.js`
				),
			}
		);

		apiPaths.forEach((apiPath) => {
			const handlerFunction = require(apiPath).default;

			if (!handlerFunction) {
				throw new ConfigError(
					"Error during auto-express configuration",
					"No handler default function is declared in " + apiPath
				);
			}

			let method = apiPath.match("(get|put|delete|post|patch).js")[0];

			if (!method) {
				throw new ConfigError(
					"Error during auto-express configuration",
					"path" + apiPath + " is invalid"
				);
			}

			method = method.slice(0, -3);

			const routePath = apiPath
				.split(__dirname)[1]
				.replace(/\{(.*)\}/, ":$1")
				.slice(0, -method.length - 4);

			const middlewarePath = path.join(
				__dirname,
				`${routePath}/middlewares/${method}.js`
			);

			let middlewares = [];
			if (fs.existsSync(middlewarePath)) {
				middlewares = require(middlewarePath).default;
				if (!middlewares) {
					throw new ConfigError(
						"Error during auto-express configuration",
						"No array default function is declared in " +
							middlewarePath
					);
				}
			}

			const swaggerPath = apiPath
				.split(__dirname)[1]
				.slice(0, -method.length - 4);

			const swaggerPathSchema = JSON.parse(
				fs.readFileSync(
					path.join(__dirname, `${swaggerPath}/${method}.schema.json`)
				)
			);

			router.swagger.paths[swaggerPath] = {
				[method]: {
					...swaggerPathSchema,
				},
			};

			router[method](
				routePath,
				middlewares.map(middleware),
				handler(handlerFunction)
			);
		});
		return router;
	};

	router.serveSwagger = () => {
		router.get("/swagger.json", (req, res) =>
			res.status(200).send(router.swagger)
		);
		router.use("/swagger/", swaggerUi.serve);
		router.get(
			"/swagger/",
			swaggerUi.setup(null, { swaggerUrl: "../swagger.json" })
		);
		return router;
	};

	return router;
};

export default autoExpress;
