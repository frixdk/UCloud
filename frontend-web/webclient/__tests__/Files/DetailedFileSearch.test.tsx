import * as React from "react";
import {Provider} from "react-redux";
import {MemoryRouter} from "react-router";
import {create} from "react-test-renderer";
import {ThemeProvider} from "styled-components";
import DetailedFileSearch from "../../app/Files/DetailedFileSearch";
import theme from "../../app/ui-components/theme";
import {store} from "../../app/Utilities/ReduxUtilities";

describe("Detailed File Search", () => {
    test("Mount file search", () => {
        expect(create(
            <Provider store={store}>
                <ThemeProvider theme={theme}>
                    <MemoryRouter>
                        <DetailedFileSearch />
                    </MemoryRouter>
                </ThemeProvider>
            </Provider>
        ).toJSON()).toMatchSnapshot();
    });
});
