export const RECEIVE_FILES = "RECEIVE_FILES";
export const SET_FAVORITE = "SET_FAVORITE";
export const UPDATE_FILES_PER_PAGE = "UPDATE_FILES_PER_PAGE";
export const UPDATE_FILES = "UPDATE_FILES";
export const SET_LOADING = "SET_LOADING";
export const UPDATE_PATH = "UPDATE_PATH";
export const TO_PAGE = "TO_PAGE";

const files = (state = [], action) => {
    switch (action.type) {
        case RECEIVE_FILES: {
            return { ...state, files: { ...state.files, files: action.files, filesLoading: false, path: action.path }};
        }
        case UPDATE_FILES_PER_PAGE: {
            return { ...state, files: { ...state.files, files: action.files, filesPerPage: action.filesPerPage } };
        }
        case UPDATE_FILES: {
            return { ...state, files: { ...state.files, files: action.files }};
        }
        case SET_LOADING: {
            return { ...state, files: { ...state.files, filesLoading: action.loading }};
        }
        case UPDATE_PATH: {
            return { ...state, files: { ...state.files, path: action.path }};
        }
        case TO_PAGE: {
            return { ...state, files: { ...state.files, currentFilesPage: action.pageNumber }};
        }
        default: {
            return state;
        }
    }
}

export default files;