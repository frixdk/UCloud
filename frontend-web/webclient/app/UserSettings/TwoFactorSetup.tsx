import * as React from "react";
import { Cloud } from "Authentication/SDUCloudObject";
import { TwoFactorSetupState } from ".";
import * as UF from "UtilityFunctions";
import * as Heading from "ui-components/Heading";
import { Image, Flex, Divider, Input, LoadingButton, ExternalLink } from "ui-components";

const googlePlay = require("Assets/Images/google-play-badge.png");
const appStore = require("Assets/Images/app-store-badge.png");

export class TwoFactorSetup extends React.Component<{}, TwoFactorSetupState> {
    constructor(props) {
        super(props);
        this.state = this.initialState();
    }

    componentDidMount() {
        this.loadStatus();
    }

    private loadStatus() {
        this.setLoading(true);
        Cloud.get("2fa/status", "/auth")
            .then((res) => {
                this.setState(() => ({
                    isConnectedToAccount: res.response.connected
                }));
            })
            .catch(res => {
                const why: string = res.response.why ? res.response.why : "";
                UF.failureNotification("Could not fetch 2FA status. " + why);
            })
            .then(() => this.setLoading(false));
    }

    initialState = (): TwoFactorSetupState => ({
        verificationCode: "",
        isConnectedToAccount: false,
        isLoading: false
    });

    render() {
        return (
            <React.StrictMode>
                <Heading.h1>Two Factor Authentication</Heading.h1>
                <b>{this.displayConnectedStatus()}</b>
                <Divider />
                {!this.state.isConnectedToAccount ? this.setupPage() : undefined}
            </React.StrictMode>
        );
    }

    private displayConnectedStatus() {
        if (this.state.isConnectedToAccount === undefined) {
            return "Unknown. Could not fetch 2FA status";
        } else if (this.state.isConnectedToAccount === true) {
            return "You have a 2FA device connected to your account";
        } else {
            return "You do NOT have a 2FA device connected to your account";
        }
    }

    private setupPage() {
        return (
            <div>
                <Heading.h3>2FA Setup</Heading.h3>
                <p>
                    In order to activate 2FA on your account you must have a
                    device capable of issuing time-based one time passwords
                    (TOTP). For this we recommend the "Google Authenticator"
                    app, available for both Android and iOS.
                </p>

                <Flex>
                    <ExternalLink href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=en_us">
                        <Image width="150px" src={googlePlay} />
                    </ExternalLink>

                    <ExternalLink href="https://itunes.apple.com/us/app/google-authenticator/id388497605">
                        <Image width="150px" src={appStore} />
                    </ExternalLink>
                </Flex>

                {this.state.challengeId === undefined ?
                    <React.Fragment>
                        <p>Once you are ready click the button below to get started:</p>

                        <LoadingButton
                            color="green"
                            content="Start setup"
                            loading={this.state.isLoading}
                            positive onClick={() => this.onSetupStart()}
                        />
                    </React.Fragment>
                    :
                    this.displayQRCode()
                }
            </div>
        );
    }

    private displayQRCode() {
        if (this.state.qrCode === undefined ||
            this.state.challengeId === undefined) {
            return undefined;
        }

        return (
            <div>
                <Divider />
                <h4>Step One</h4>
                <p>Open the 'Google Authenticator' app on your phone</p>
                <Divider />

                <h4>Step Two</h4>
                <p>Add a new authenticator by tapping the '+' icon.</p>
                <Divider />

                <h4>Step Three</h4>
                <p>Use the 'Scan a barcode option'</p>
                <Divider />

                <h4>Step Four</h4>
                <p>Scan the barcode below using your phone's camera</p>
                <img src={this.state.qrCode} />
                <Divider />

                <h4>Step Five</h4>
                <p>Enter the verification code from your app in the field below.</p>

                <form onSubmit={e => (e.preventDefault(), this.onVerificationSubmit())}>
                    <Input
                        placeholder="6-digit verification code"
                        value={this.state.verificationCode}
                        type="text"
                        onChange={({ target }) => {
                            this.setState(() => ({
                                verificationCode: target.value
                            }))
                        }}
                    />

                    <LoadingButton
                        color="blue"
                        type="button"
                        content="Submit code"
                        loading={this.state.isLoading}
                    />
                </form>
            </div>
        );
    }

    private onSetupStart() {
        this.setLoading(true);
        Cloud.post("2fa", undefined, "/auth").then(res => {
            this.setState(() => ({
                challengeId: res.response.challengeId,
                qrCode: res.response.qrCodeB64Data
            }));

        }).catch(() => {
        }).then(() => {
            this.setLoading(false);
        });
    }

    private setLoading = (isLoading: boolean) => this.setState(() => ({ isLoading }));


    private onVerificationSubmit() {
        this.setLoading(true);
        Cloud.post("2fa/challenge", {
            challengeId: this.state.challengeId,
            verificationCode: this.state.verificationCode
        }, "/auth").then((res) => {
            this.setState(() => ({
                isConnectedToAccount: true
            }));
        }).catch((res) => {
            let response = res.response;
            let why: string = "Could not submit verification code. Try again later";
            if (response !== undefined && response.why !== undefined) {
                why = response.why;
            }
            UF.failureNotification(why);
        }).then(() => {
            this.setLoading(false);
        });
    }
}