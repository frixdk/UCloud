import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { ReduxObject } from "DefaultObjects";
import { updatePageTitle, StatusActions, setActivePage } from "Navigation/Redux/StatusActions";
import { setPrioritizedSearch, HeaderActions } from "Navigation/Redux/HeaderActions";
import { Application } from "Applications";
import { Page } from "Types";
import * as Pagination from "Pagination";
import { NewApplicationCard } from "./Card";
import { LoadingMainContainer } from "MainContainer/MainContainer";
import { GridCardGroup } from "ui-components/Grid";
import * as Actions from "./Redux/FavoriteActions";
import { Type as ReduxType } from "./Redux/FavoriteObject";
import { loadingEvent } from "LoadableContent";
import * as Heading from "ui-components/Heading";
import { SidebarPages } from "ui-components/Sidebar";
import { Spacer } from "ui-components/Spacer";
import { CustomEntriesPerPage } from "UtilityComponents";

interface InstalledOperations {
    onInit: () => void
    fetchItems: (pageNumber: number, itemsPerPage: number) => void
    setActivePage: () => void
}

type InstalledStateProps = ReduxType;

type InstalledProps = InstalledOperations & InstalledStateProps;

class Installed extends React.Component<InstalledProps> {
    componentDidMount() {
        const { props } = this;

        props.onInit();
        props.fetchItems(0, 25);
        props.setActivePage();
    }

    render() {
        const { props } = this;
        const page = props.applications.content as Page<Application>;

        const main = (
            <Pagination.List
                loading={props.applications.loading}
                page={page}
                customEntriesPerPage
                onItemsPerPageChanged={size => props.fetchItems(0, size)}
                onPageChanged={pageNumber => props.fetchItems(pageNumber, page.itemsPerPage)}
                pageRenderer={page => <InstalledPage page={page} />}
            />
        );


        const pageNumber = !!page ? page.pageNumber : 0;
        const itemsPerPage = !!page ? page.itemsPerPage : 25;

        const header = (
            <Spacer
                left={<Heading.h1>My Apps</Heading.h1>}
                right={<CustomEntriesPerPage
                    entriesPerPage={itemsPerPage}
                    loading={props.applications.loading}
                    text={"Apps per page"}
                    onChange={size => props.fetchItems(0, size)}
                    onRefreshClick={() => props.fetchItems(pageNumber, itemsPerPage)}
                />}
            />
        );

        return (
            <LoadingMainContainer
                header={header}
                loadable={this.props.applications}
                main={main}
                sidebar={null}
            />
        );
    }
}

const InstalledPage: React.StatelessComponent<{ page: Page<Application> }> = props => (
    <GridCardGroup>
        {props.page.items.map((it, idx) => (
            <NewApplicationCard app={it} key={idx} linkToRun />)
        )}
    </GridCardGroup>
);

const mapDispatchToProps = (dispatch: Dispatch<Actions.Type | HeaderActions | StatusActions>): InstalledOperations => ({
    onInit: () => {
        dispatch(updatePageTitle("Applications"))
        dispatch(setPrioritizedSearch("applications"))
    },

    fetchItems: async (pageNumber: number, itemsPerPage: number) => {
        dispatch({ type: Actions.Tag.RECEIVE_APP, payload: loadingEvent(true) });
        dispatch(await Actions.fetch(itemsPerPage, pageNumber))
    },

    setActivePage: () => dispatch(setActivePage(SidebarPages.MyApps))
});

const mapStateToProps = (state: ReduxObject): InstalledStateProps => state.applicationsFavorite;

export default connect(mapStateToProps, mapDispatchToProps)(Installed);