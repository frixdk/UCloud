import * as React from "react";
import Spinner, {HexSpinWrapper} from "LoadingIcon/LoadingIcon";
import {BreadCrumbsBase} from "ui-components/Breadcrumbs";
import {Link} from "ui-components";
import {useProjectManagementStatus} from "Project/index";
import {styled} from "@linaria/react";

export interface ProjectBreadcrumbsProps {
    crumbs: {title: string, link?: string}[];
    allowPersonalProject?: true;
}

const ProjectBreadcrumbsWrapper = styled(BreadCrumbsBase)`
    width: 100%;
    max-width: unset;
    flex-grow: 1;
    
    .ucloud-loading.icon {
        margin: 0;
        display: inline;
    }
`;

export const ProjectBreadcrumbs: React.FunctionComponent<ProjectBreadcrumbsProps> = props => {
    const {projectDetails, projectId} = useProjectManagementStatus({
        isRootComponent: false,
        allowPersonalProject: props.allowPersonalProject
    });
    let projectNameComponent = <Spinner />;
    if (!projectDetails.loading) {
        const title = projectDetails.data.title;
        projectNameComponent = <>{title.slice(0, 20).trim()}{title.length > 20 ? "..." : ""}</>;
    }

    return <ProjectBreadcrumbsWrapper mb="12px" embedded={false}>
        <span><Link to="/projects">My Projects</Link></span>
        {projectId ? (
            <span><Link to="/project/dashboard">{projectNameComponent}</Link></span>
        ) : props.allowPersonalProject ? <span><Link to="/project/dashboard">My Workspace</Link></span> : null}
        {props.crumbs.map((crumb, idx) => {
            if (crumb.link) {
                return <span key={idx}><Link to={crumb.link}>{crumb.title}</Link></span>;
            } else {

                return <span key={idx}>{crumb.title}</span>;
            }
        })}
    </ProjectBreadcrumbsWrapper>;
};
