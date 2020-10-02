const Path = require("path")
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin")
const ts = require("typescript");

const ASSET_REG = /asset_(url|path|filter)/
const ASSET_FILTER_REG = /asset_filter/

function TransformerFactory(program) {
  return function AssetTransformer(context) {
    const factory = context.factory

    function visitor(node) {
      if (ts.isCallExpression(node) && ASSET_REG.test(node.expression.getText()) && node.arguments.length === 1) {
        const callExpression = node.expression.getText()
        const arg0 = node.arguments[0]

        // StringLiteral = "flags.png" | 'flags.png' (accepted)
        // NoSubstitutionTemplateLiteral = `flags.png` (accepted)
        // TemplateLiteral = `flags.${extension}` (rejected)
        // BinaryExpression = "flags" + extension | 'flags' + extension | `flags` + extension (rejected)
        const isStringLiteral = ts.isStringLiteral(arg0) || ts.isNoSubstitutionTemplateLiteral(arg0)
        if (!isStringLiteral) return node

        const filename = node.getSourceFile().fileName

        // asset_filter
        if (ASSET_FILTER_REG.test(callExpression)) {
          const match = arg0.text.trim()
          const reg = new RegExp(match)
          const records = []

          const assets = [
            {
              input: "webm/video1.webm",
              output: "webm/video1-q2434fsd433655fgd.webm",
            },
            {
              input: "webm/video2.webm",
              output: "webm/video2-q2434fsd433655fgd.webm",
            },
            {
              input: "mp4/video2.mp4",
              output: "mp4/video2-q2434fsd433655fgd.mp4",
            },
          ]

          assets.forEach(asset => {
            if (reg.test(asset.input)) {
              const expression = ts.createStringLiteral(asset.output)
              const property = factory.createPropertyAssignment(
                factory.createStringLiteral(asset.input),
                expression
              )
              records.push(property)
            }
          })

          return factory.createObjectLiteralExpression(records)
        } else {
          const path = arg0.text.trim()
          return factory.createStringLiteral(path)
        }
      }

      return ts.visitEachChild(node, visitor, context)
    }

    return function visit(node) {
      return ts.visitNode(node, visitor)
    }
  }
}

module.exports = {
  entry: {
    "main": [ "./app/scripts/main.ts" ]
  },
  context: Path.join(process.cwd()),

  output: {
    path: Path.join(process.cwd(), "public"),
  },

  mode: "development",
  devtool: "inline-source-map",
  target: "web",
  cache: true,
  optimization: { nodeEnv: 'development' },

  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/i,
        use: [
          {
            loader: "ts-loader",
            options: {
              // disable type checker - we will use fork plugin
              transpileOnly: true,
              // onlyCompileBundledFiles: true,
              getCustomTransformers(program) {
                return {
                  before: [
                    TransformerFactory(program)
                  ]
                }
              }
            }
          }
        ]
      }
    ]
  },

  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        configFile: Path.join(process.cwd(), "tsconfig.json"),
      }
    })
  ],

  devServer: {
    contentBase: "./app",
    host: "0.0.0.0",
    port: 4000,
    watchOptions: {
      poll: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    },
    disableHostCheck: true,
  },
}