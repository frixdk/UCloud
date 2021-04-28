import * as React from "react";
import {
    listByProductArea,
    Product,
    productCategoryEquals,
    ProductCategoryId,
    UCLOUD_PROVIDER
} from "Accounting/index";
import {Text, Tooltip} from "ui-components";
import {addThousandSeparators, creditFormatter} from "Project/ProjectUsage";
import {useGlobalCloudAPI} from "Authentication/DataHook";
import * as CSS from "csstype";
import {emptyPage} from "DefaultObjects";
import {styled} from "@linaria/react";


export const Balance: React.FunctionComponent<{
    amount: number;
    productCategory: ProductCategoryId;
    precision?: number;
} & {textAlign?: CSS.Property.TextAlign}> = props => {
    return (
        <Tooltip
            position={"top"}
            trigger={
                <BalanceTextWrapper textAlign={props.textAlign}>
                    {creditFormatter(props.amount, props.precision)}
                </BalanceTextWrapper>
            }
        >
            <BalanceExplainer {...props} />
        </Tooltip>
    );
};

/**
 * Returns the price of the only currently existing storage product
 */
export function useStoragePrice(): number {
    const [storageProducts] = useGlobalCloudAPI<Page<Product>>(
        "storageProducts",
        listByProductArea({itemsPerPage: 100, page: 0, area: "STORAGE", provider: UCLOUD_PROVIDER, showHidden: true}),
        emptyPage
    );

    const items = storageProducts.data.items;
    if (items.length === 0) return 0;
    return items[0].pricePerUnit;
}

// Hack: We need products to only load once
// TODO: Find a proper way to load this kind of shared data
const providerFetched: Record<string, boolean> = {};

export const BalanceExplainer: React.FunctionComponent<{
    amount: number;
    productCategory: ProductCategoryId;
    precision?: number;
}> = props => {
    const {provider} = props.productCategory;

    const [computeProducts, fetchCompute, computeParams] = useGlobalCloudAPI<Page<Product>>(
        "computeProducts" + provider,
        listByProductArea({itemsPerPage: 100, page: 0, area: "COMPUTE", provider: provider, showHidden: true}),
        emptyPage
    );
    const [storageProducts, fetchStorage, storageParams] = useGlobalCloudAPI<Page<Product>>(
        "storageProducts" + provider,
        listByProductArea({itemsPerPage: 100, page: 0, area: "STORAGE", provider: provider, showHidden: true}),
        emptyPage
    );

    React.useEffect(() => {
        if (providerFetched[provider]) return;
        providerFetched[provider] = true;
        fetchCompute(computeParams);
        fetchStorage(storageParams);
    }, [provider]);

    let pricePerUnit: number | null = null;
    let productName: string | null = null;
    let productArea: "compute" | "storage" | "ingress" | "license" | "network_ip" | null = null;
    {
        for (const prod of computeProducts.data.items) {
            if (productCategoryEquals(prod.category, props.productCategory)) {
                if (pricePerUnit === null || prod.pricePerUnit > pricePerUnit) {
                    pricePerUnit = prod.pricePerUnit;
                    productName = prod.id;
                    productArea = prod.type;
                }
            }
        }
        for (const prod of storageProducts.data.items) {
            if (productCategoryEquals(prod.category, props.productCategory)) {
                if (pricePerUnit === null || prod.pricePerUnit > pricePerUnit) {
                    pricePerUnit = prod.pricePerUnit;
                    productName = prod.id;
                    productArea = prod.type;
                }
            }
        }
    }

    if (productArea === "ingress" || productArea === "license") return null;

    if (productName === null || pricePerUnit === null || productArea === null) {
        return <>{creditFormatter(props.amount)}</>;
    } else {
        let units = Math.floor(props.amount / pricePerUnit);
        const unitText = productArea === "compute" ? "hours on" : "months of 50 GB on";
        if (productArea === "storage") {
            units = Math.floor(units / (30 * 50));
        } else if (productArea === "compute") {
            units = Math.floor(units / 60);
        }

        return <>{addThousandSeparators(units)} {unitText} {productName}</>;
    }
};

// Provides a way to style the text
// By default it will take up all the space of the parent
export const BalanceTextWrapper = styled(Text)`
    width: 100%;
`;
