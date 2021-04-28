import {buildQueryString} from "Utilities/URIUtilities";
import {compute} from "UCloud";
type NameAndVersion = compute.NameAndVersion;

export const view = (name: string, version: string): string =>
    `/applications/details/${encodeURIComponent(name)}/${encodeURIComponent(version)}/`;

export const viewApplication = (application: { name: string, version: string }): string =>
    view(application.name, application.version);

export const run = (name: string, version: string): string =>
    `/applications/${encodeURIComponent(name)}/${encodeURIComponent(version)}/`;

export const runApplication = (application: NameAndVersion): string =>
    run(application.name, application.version);

export const results = (): string => `/applications/results`;

export const browse = (itemsPerPage = 25, page = 0): string =>
    buildQueryString(`/applications`, {itemsPerPage, page});

export const browseByTag = (tag: string, itemsPerPage = 25, page = 0): string =>
    buildQueryString(`/applications`, {tag, itemsPerPage, page});
