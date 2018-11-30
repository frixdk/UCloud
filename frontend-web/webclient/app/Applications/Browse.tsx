import * as React from "react";
import * as Pagination from "Pagination";
import { connect } from "react-redux";
import {
    fetchApplications,
    setLoading,
    receiveApplications,
    fetchFavoriteApplications,
    setFavoritesLoading
} from "./Redux/ApplicationsActions";
import { updatePageTitle } from "Navigation/Redux/StatusActions";
import { Page } from "Types";
import { Application } from ".";
import { ApplicationsProps, ApplicationsOperations } from ".";
import { setErrorMessage } from "./Redux/ApplicationsActions";
import { favoriteApplicationFromPage } from "Utilities/ApplicationUtilities";
import { Cloud } from "Authentication/SDUCloudObject";
import { setPrioritizedSearch } from "Navigation/Redux/HeaderActions";
import { Dispatch } from "redux";
import { ReduxObject, ApplicationReduxObject } from "DefaultObjects";
import { MainContainer } from "MainContainer/MainContainer";
import { Navigation, Pages } from "./Navigation";
import { ApplicationCard } from "./Card";
import styled from "styled-components";
import * as Heading from "ui-components/Heading";
import { Link } from "react-router-dom";
import { CardGroup } from "ui-components/Card";

const CategoryList = styled.ul`
    padding: 0;

    & > li {
        list-style: none;
    }
`;

const CategoryItem: React.StatelessComponent = props => (
    <li><Link to="#">{props.children}</Link></li>
);

const Sidebar: React.StatelessComponent = () => (<>
    <Heading.h4>Featured</Heading.h4>
    <CategoryList>
        <CategoryItem>Popular</CategoryItem>
        <CategoryItem>Staff picks</CategoryItem>
    </CategoryList>

    <Heading.h4>Categories</Heading.h4>
    <CategoryList>
        <CategoryItem>Biomedicine</CategoryItem>
        <CategoryItem>Toys</CategoryItem>
        <CategoryItem></CategoryItem>
    </CategoryList>

    <Heading.h4>Fields</Heading.h4>
    <CategoryList>
        <CategoryItem>Natural Sciences</CategoryItem>
        <CategoryItem>Formal Sciences</CategoryItem>
        <CategoryItem>Life Sciences</CategoryItem>
        <CategoryItem>Social Sciences</CategoryItem>
        <CategoryItem>Applied Sciences</CategoryItem>
        <CategoryItem>Interdisciplinary Sciences</CategoryItem>
        <CategoryItem>Philosophy Sciences</CategoryItem>
    </CategoryList>
</>);

class Applications extends React.Component<ApplicationsProps> {
    componentDidMount() {
        const { props } = this;
        props.updatePageTitle();
        props.prioritizeApplicationSearch();
        if (this.props.page.items.length === 0) {
            props.setLoading(true);
            props.fetchApplications(props.page.pageNumber, props.page.itemsPerPage);
            props.fetchFavorites(props.page.pageNumber, props.page.itemsPerPage);
        }
    }

    render() {
        const { page, loading, fetchApplications, favorites, onErrorDismiss, receiveApplications, ...props } = this.props;
        const favoriteApp = async (name: string, version: string) => {
            receiveApplications(await favoriteApplicationFromPage(name, version, page, Cloud));
            props.fetchFavorites(0, favorites.itemsPerPage);
        }

        const main = (
            <Pagination.List
                loading={loading}
                onErrorDismiss={onErrorDismiss}
                errorMessage={props.error}
                onRefresh={() => fetchApplications(page.pageNumber, page.itemsPerPage)}
                pageRenderer={({ items }: Page<Application>) =>
                    <CardGroup>
                        {items.map((app, index) =>
                            <ApplicationCard
                                key={index}
                                favoriteApp={favoriteApp}
                                app={app}
                                isFavorite={app.favorite}
                            />
                        )}
                    </CardGroup>
                }
                page={page}
                onItemsPerPageChanged={size => fetchApplications(0, size)}
                onPageChanged={pageNumber => fetchApplications(pageNumber, page.itemsPerPage)}
            />
        );

        return (
            <MainContainer
                header={<Navigation selected={Pages.BROWSE} />}
                main={main}
                sidebar={<Sidebar />}
            />
        );
    }
}

const mapDispatchToProps = (dispatch: Dispatch): ApplicationsOperations => ({
    prioritizeApplicationSearch: () => dispatch(setPrioritizedSearch("applications")),
    onErrorDismiss: () => dispatch(setErrorMessage()),
    updatePageTitle: () => dispatch(updatePageTitle("Applications")),
    setLoading: (loading: boolean) => dispatch(setLoading(loading)),
    setFavoritesLoading: (loading: boolean) => dispatch(setFavoritesLoading(loading)),
    fetchApplications: async (pageNumber: number, itemsPerPage: number) => dispatch(await fetchApplications(pageNumber, itemsPerPage)),
    receiveApplications: (applications: Page<Application>) => dispatch(receiveApplications(applications)),
    fetchFavorites: async (pageNumber: number, itemsPerPage: number) => dispatch(await fetchFavoriteApplications(pageNumber, itemsPerPage))
});

const mapStateToProps = ({ applications }: ReduxObject): ApplicationReduxObject & { favCount: number } => ({
    ...applications,
    favCount: applications.page.items.filter(it => it.favorite).length
});

export default connect(mapStateToProps, mapDispatchToProps)(Applications);