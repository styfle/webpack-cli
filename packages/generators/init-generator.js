"use strict";

const Generator = require("yeoman-generator");
const chalk = require("chalk");
const logSymbols = require("log-symbols");

const Input = require("@webpack-cli/webpack-scaffold").Input;
const Confirm = require("@webpack-cli/webpack-scaffold").Confirm;
const List = require("@webpack-cli/webpack-scaffold").List;

const getPackageManager = require("@webpack-cli/utils/package-manager")
	.getPackageManager;

const entryQuestions = require("./utils/entry");
const getBabelPlugin = require("./utils/module");
const getDefaultPlugins = require("./utils/plugins");
const tooltip = require("./utils/tooltip");

/**
 *
 * Generator for initializing a webpack config
 *
 * @class 	InitGenerator
 * @extends Generator
 * @returns {Void} After execution, transforms are triggered
 *
 */
module.exports = class InitGenerator extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.isProd = false;
		(this.usingDefaults = false),
		(this.dependencies = [
			"webpack",
			"webpack-cli",
			"uglifyjs-webpack-plugin",
			"babel-plugin-syntax-dynamic-import"
		]);
		this.configuration = {
			config: {
				webpackOptions: {},
				topScope: []
			}
		};
	}

	prompting() {
		const done = this.async();
		const self = this;
		let regExpForStyles;
		let ExtractUseProps;
		let outputPath = "dist";
		process.stdout.write(
			"\n" +
				logSymbols.info +
				chalk.blue(" INFO ") +
				"For more information and a detailed description of each question, have a look at " +
				chalk.bold.green(
					"https://github.com/webpack/webpack-cli/blob/master/INIT.md"
				) +
				"\n"
		);
		process.stdout.write(
			logSymbols.info +
				chalk.blue(" INFO ") +
				"Alternatively, run `webpack(-cli) --help` for usage info." +
				"\n\n"
		);
		this.configuration.config.webpackOptions.module = {
			rules: []
		};
		this.configuration.config.topScope.push(
			"const webpack = require('webpack')",
			"const path = require('path')",
			"\n"
		);

		this.prompt([
			Confirm("entryType", "Will your application have multiple bundles?")
		])
			.then(entryTypeAnswer => {
				// Ask different questions for entry points
				return entryQuestions(self, entryTypeAnswer);
			})
			.then(entryOptions => {
				if (entryOptions !== "\"\"") {
					this.configuration.config.webpackOptions.entry = entryOptions;
				}
				return this.prompt([
					Input(
						"outputType",
						"Which folder will your generated bundles be in? [default: dist]:"
					)
				]);
			})
			.then(outputTypeAnswer => {
				// As entry is not required anymore and we dont set it to be an empty string or """""
				// it can be undefined so falsy check is enough (vs entry.length);
				if (
					!this.configuration.config.webpackOptions.entry &&
					!this.usingDefaults
				) {
					this.configuration.config.webpackOptions.output = {
						filename: "'[name].[chunkhash].js'",
						chunkFilename: "'[name].[chunkhash].js'"
					};
				} else if (!this.usingDefaults) {
					this.configuration.config.webpackOptions.output = {
						filename: "'[name].[chunkhash].js'"
					};
				}
				if (outputTypeAnswer["outputType"].length) {
					outputPath = outputTypeAnswer["outputType"];
				}
				if (!this.usingDefaults) {
					this.configuration.config.webpackOptions.output.path = `path.resolve(__dirname, '${outputPath}')`;
				}
			})
			.then(() => {
				this.isProd = this.usingDefaults ? true : false;
				this.configuration.config.configName = this.isProd ? "prod" : "dev";
				this.configuration.config.webpackOptions.mode = this.isProd
					? "'production'"
					: "'development'";
				this.configuration.config.webpackOptions.plugins = this.isProd ? [] : getDefaultPlugins();
				return this.prompt([
					Confirm("babelConfirm", "Will you be using ES2015?")
				]);
			})
			.then(babelConfirmAnswer => {
				if (babelConfirmAnswer["babelConfirm"] === true) {
					this.configuration.config.webpackOptions.module.rules.push(
						getBabelPlugin()
					);
					this.dependencies.push(
						"babel-core",
						"babel-loader",
						"babel-preset-env"
					);
				}
			})
			.then(() => {
				return this.prompt([
					List("stylingType", "Will you use one of the below CSS solutions?", [
						"SASS",
						"LESS",
						"CSS",
						"PostCSS",
						"No"
					])
				]);
			})
			.then(stylingTypeAnswer => {
				ExtractUseProps = [];
				switch (stylingTypeAnswer["stylingType"]) {
					case "SASS":
						this.dependencies.push(
							"sass-loader",
							"node-sass",
							"style-loader",
							"css-loader"
						);
						regExpForStyles = `${new RegExp(/\.(scss|css)$/)}`;
						if (this.isProd) {
							ExtractUseProps.push(
								{
									loader: "'css-loader'",
									options: {
										sourceMap: true
									}
								},
								{
									loader: "'sass-loader'",
									options: {
										sourceMap: true
									}
								}
							);
						} else {
							ExtractUseProps.push(
								{
									loader: "'style-loader'"
								},
								{
									loader: "'css-loader'"
								},
								{
									loader: "'sass-loader'"
								}
							);
						}
						break;
					case "LESS":
						regExpForStyles = `${new RegExp(/\.(less|css)$/)}`;
						this.dependencies.push(
							"less-loader",
							"less",
							"style-loader",
							"css-loader"
						);
						if (this.isProd) {
							ExtractUseProps.push(
								{
									loader: "'css-loader'",
									options: {
										sourceMap: true
									}
								},
								{
									loader: "'less-loader'",
									options: {
										sourceMap: true
									}
								}
							);
						} else {
							ExtractUseProps.push(
								{
									loader: "'css-loader'",
									options: {
										sourceMap: true
									}
								},
								{
									loader: "'less-loader'",
									options: {
										sourceMap: true
									}
								}
							);
						}
						break;
					case "PostCSS":
						this.configuration.config.topScope.push(
							tooltip.postcss(),
							"const autoprefixer = require('autoprefixer');",
							"const precss = require('precss');",
							"\n"
						);
						this.dependencies.push(
							"style-loader",
							"css-loader",
							"postcss-loader",
							"precss",
							"autoprefixer"
						);
						regExpForStyles = `${new RegExp(/\.css$/)}`;
						if (this.isProd) {
							ExtractUseProps.push(
								{
									loader: "'css-loader'",
									options: {
										sourceMap: true,
										importLoaders: 1
									}
								},
								{
									loader: "'postcss-loader'",
									options: {
										plugins: `function () {
											return [
												precss,
												autoprefixer
											];
										}`
									}
								}
							);
						} else {
							ExtractUseProps.push(
								{
									loader: "'style-loader'"
								},
								{
									loader: "'css-loader'",
									options: {
										sourceMap: true,
										importLoaders: 1
									}
								},
								{
									loader: "'postcss-loader'",
									options: {
										plugins: `function () {
											return [
												precss,
												autoprefixer
											];
										}`
									}
								}
							);
						}
						break;
					case "CSS":
						this.dependencies.push("style-loader", "css-loader");
						regExpForStyles = `${new RegExp(/\.css$/)}`;
						if (this.isProd) {
							ExtractUseProps.push({
								loader: "'css-loader'",
								options: {
									sourceMap: true
								}
							});
						} else {
							ExtractUseProps.push(
								{
									loader: "'style-loader'",
									options: {
										sourceMap: true
									}
								},
								{
									loader: "'css-loader'"
								}
							);
						}
						break;
					default:
						regExpForStyles = null;
				}
			})
			.then(() => {
				if (this.isProd) {
					// Ask if the user wants to use extractPlugin
					return this.prompt([
						Input(
							"extractPlugin",
							"If you want to bundle your CSS files, what will you name the bundle? (press enter to skip)"
						)
					]);
				}
			})
			.then(extractPluginAnswer => {
				if (regExpForStyles) {
					if (this.isProd) {
						const cssBundleName = extractPluginAnswer["extractPlugin"];
						this.configuration.config.topScope.push(tooltip.cssPlugin());
						this.dependencies.push("mini-css-extract-plugin");

						if (cssBundleName.length !== 0) {
							this.configuration.config.webpackOptions.plugins.push(
								// TODO: use [contenthash] after it is supported
								`new MiniCssExtractPlugin({ filename:'${cssBundleName}.[chunkhash].css' })`
							);
						} else {
							this.configuration.config.webpackOptions.plugins.push(
								"new MiniCssExtractPlugin({ filename:'style.css' })"
							);
						}

						ExtractUseProps.unshift({
							loader: "MiniCssExtractPlugin.loader"
						});

						const moduleRulesObj = {
							test: regExpForStyles,
							use: ExtractUseProps
						};

						this.configuration.config.webpackOptions.module.rules.push(
							moduleRulesObj
						);
						this.configuration.config.topScope.push(
							"const MiniCssExtractPlugin = require('mini-css-extract-plugin');",
							"\n"
						);
					} else {
						const moduleRulesObj = {
							test: regExpForStyles,
							use: ExtractUseProps
						};

						this.configuration.config.webpackOptions.module.rules.push(
							moduleRulesObj
						);
					}
				}
				// add splitChunks options for transparency
				// defaults coming from: https://webpack.js.org/plugins/split-chunks-plugin/#optimization-splitchunks
				this.configuration.config.topScope.push(tooltip.splitChunks());
				this.configuration.config.webpackOptions.optimization = {
					splitChunks: {
						chunks: "'async'",
						minSize: 30000,
						minChunks: 1,
						// for production name is recommended to be off
						name: !this.isProd,
						cacheGroups: {
							vendors: {
								test: "/[\\\\/]node_modules[\\\\/]/",
								priority: -10
							}
						}
					}
				};
				done();
			});
	}
	installPlugins() {
		if (this.isProd) {
			this.dependencies = this.dependencies.filter(
				p => p !== "uglifyjs-webpack-plugin"
			);
		} else {
			this.configuration.config.topScope.push(
				tooltip.uglify(),
				"const UglifyJSPlugin = require('uglifyjs-webpack-plugin');",
				"\n"
			);
		}
		const packager = getPackageManager();
		const opts = packager === "yarn" ? { dev: true } : { "save-dev": true };
		this.runInstall(packager, this.dependencies, opts);
	}
	writing() {
		this.config.set("configuration", this.configuration);
	}
};
