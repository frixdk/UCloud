module.exports = {
    preset: 'ts-jest',
    collectCoverage: true,
    coverageDirectory: "<rootDir>/coverage",
    coverageReporters: [
        "html",
        "cobertura"
    ],
    transform: {
        "^.+\\.tsx?$": "ts-jest",
        "^.+\\.jsx?$": "<rootDir>/node_modules/babel-jest",
    },
    moduleNameMapper: {
        "^.+\\.(png|ttf|jpg|woff2)$": "file-loader",
        "^.+\\.css$": "css-loader",
        "date-fns/esm": "date-fns",
        "date-fns/esm/locale": "date-fns/locale",
        "Authentication/HttpClientInstance": "<rootDir>/__tests__/mock/Cloud.ts"
    },
    modulePaths: [
        "<rootDir>/app/"
    ],
    globals: {
        "DEVELOPMENT_ENV": true,
        "ts-jest": {
            "ts-config": "tsconfig.json",
            diagnostics: {
                ignoreCodes: [
                    151001
                ]
            }
        }
    },
    setupFilesAfterEnv: ["<rootDir>/setupTest.ts"]
};
