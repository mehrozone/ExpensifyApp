import React, {useMemo, useState} from 'react';
import {InteractionManager, View} from 'react-native';
import ConfirmModal from '@components/ConfirmModal';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import * as Expensicons from '@components/Icon/Expensicons';
import MenuItem from '@components/MenuItem';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import ScreenWrapper from '@components/ScreenWrapper';
import ScrollView from '@components/ScrollView';
import Text from '@components/Text';
import useCardFeeds from '@hooks/useCardFeeds';
import useCardsList from '@hooks/useCardsList';
import useEnvironment from '@hooks/useEnvironment';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import usePolicy from '@hooks/usePolicy';
import useThemeStyles from '@hooks/useThemeStyles';
import {deleteWorkspaceCompanyCardFeed, setWorkspaceCompanyCardTransactionLiability} from '@libs/actions/CompanyCards';
import {getCompanyFeeds, getCustomOrFormattedFeedName, getDomainOrWorkspaceAccountID, getSelectedFeed} from '@libs/CardUtils';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';
import type {CompanyCardFeed} from '@src/types/onyx';

type WorkspaceCompanyCardsSettingsPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.COMPANY_CARDS_SETTINGS>;

function WorkspaceCompanyCardsSettingsPage({
    route: {
        params: {policyID},
    },
}: WorkspaceCompanyCardsSettingsPageProps) {
    const {isDevelopment} = useEnvironment();
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const policy = usePolicy(policyID);
    const workspaceAccountID = policy?.workspaceAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const [deleteCompanyCardConfirmModalVisible, setDeleteCompanyCardConfirmModalVisible] = useState(false);

    const [cardFeeds] = useCardFeeds(policyID);
    const [lastSelectedFeed] = useOnyx(`${ONYXKEYS.COLLECTION.LAST_SELECTED_FEED}${policyID}`, {canBeMissing: true});

    const selectedFeed = useMemo(() => getSelectedFeed(lastSelectedFeed, cardFeeds), [cardFeeds, lastSelectedFeed]);

    const [cardsList] = useCardsList(policyID, selectedFeed);
    const feedName = getCustomOrFormattedFeedName(selectedFeed, cardFeeds?.settings?.companyCardNicknames);
    const companyFeeds = getCompanyFeeds(cardFeeds);
    const selectedFeedData = selectedFeed ? companyFeeds[selectedFeed] : undefined;
    const liabilityType = selectedFeedData?.liabilityType;
    const isPersonal = liabilityType === CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.ALLOW;
    const domainOrWorkspaceAccountID = getDomainOrWorkspaceAccountID(workspaceAccountID, selectedFeedData);
    const statementPeriodEndDay = selectedFeedData?.statementPeriodEndDay;

    // s77rt remove DEV lock
    const shouldShowStatementCloseDate = isDevelopment;

    const navigateToChangeFeedName = () => {
        Navigation.navigate(ROUTES.WORKSPACE_COMPANY_CARDS_SETTINGS_FEED_NAME.getRoute(policyID));
    };

    const navigateToChangeStatementCloseDate = () => {
        Navigation.navigate(ROUTES.WORKSPACE_COMPANY_CARDS_SETTINGS_STATEMENT_CLOSE_DATE.getRoute(policyID));
    };

    const deleteCompanyCardFeed = () => {
        setDeleteCompanyCardConfirmModalVisible(false);
        Navigation.goBack();
        if (selectedFeed) {
            const {cardList, ...cards} = cardsList ?? {};
            const cardIDs = Object.keys(cards);
            const feedToOpen = (Object.keys(companyFeeds) as CompanyCardFeed[])
                .filter((feed) => feed !== selectedFeed && companyFeeds[feed]?.pendingAction !== CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE)
                .at(0);
            InteractionManager.runAfterInteractions(() => {
                deleteWorkspaceCompanyCardFeed(policyID, domainOrWorkspaceAccountID, selectedFeed, cardIDs, feedToOpen);
            });
        }
    };

    const onToggleLiability = (isOn: boolean) => {
        if (!selectedFeed) {
            return;
        }
        setWorkspaceCompanyCardTransactionLiability(
            domainOrWorkspaceAccountID,
            policyID,
            selectedFeed,
            isOn ? CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.ALLOW : CONST.COMPANY_CARDS.DELETE_TRANSACTIONS.RESTRICT,
        );
    };

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_COMPANY_CARDS_ENABLED}
        >
            <ScreenWrapper
                testID={WorkspaceCompanyCardsSettingsPage.displayName}
                style={styles.defaultModalContainer}
                enableEdgeToEdgeBottomSafeAreaPadding
            >
                <ScrollView
                    contentContainerStyle={styles.flexGrow1}
                    addBottomSafeAreaPadding
                >
                    <HeaderWithBackButton title={translate('common.settings')} />
                    <View style={styles.flex1}>
                        <MenuItemWithTopDescription
                            shouldShowRightIcon
                            title={feedName}
                            description={translate('workspace.moreFeatures.companyCards.cardFeedName')}
                            style={[styles.moneyRequestMenuItem]}
                            titleStyle={styles.flex1}
                            onPress={navigateToChangeFeedName}
                        />
                        {shouldShowStatementCloseDate && (
                            <MenuItemWithTopDescription
                                shouldShowRightIcon
                                title={statementPeriodEndDay}
                                description={translate('workspace.moreFeatures.companyCards.statementCloseDateTitle')}
                                style={[styles.moneyRequestMenuItem]}
                                titleStyle={styles.flex1}
                                onPress={navigateToChangeStatementCloseDate}
                            />
                        )}
                        <View style={[styles.mv3, styles.mh5]}>
                            <ToggleSettingOptionRow
                                title={translate('workspace.moreFeatures.companyCards.personal')}
                                switchAccessibilityLabel={translate('workspace.moreFeatures.companyCards.personal')}
                                onToggle={onToggleLiability}
                                isActive={isPersonal}
                            />
                            <Text style={[styles.mutedTextLabel, styles.mt2]}>{translate('workspace.moreFeatures.companyCards.setTransactionLiabilityDescription')}</Text>
                        </View>
                        <MenuItem
                            icon={Expensicons.Trashcan}
                            title={translate('workspace.moreFeatures.companyCards.removeCardFeed')}
                            onPress={() => setDeleteCompanyCardConfirmModalVisible(true)}
                        />
                    </View>
                    <ConfirmModal
                        isVisible={deleteCompanyCardConfirmModalVisible}
                        onConfirm={deleteCompanyCardFeed}
                        onCancel={() => setDeleteCompanyCardConfirmModalVisible(false)}
                        title={feedName && translate('workspace.moreFeatures.companyCards.removeCardFeedTitle', {feedName})}
                        prompt={translate('workspace.moreFeatures.companyCards.removeCardFeedDescription')}
                        confirmText={translate('common.delete')}
                        cancelText={translate('common.cancel')}
                        danger
                    />
                </ScrollView>
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

WorkspaceCompanyCardsSettingsPage.displayName = 'WorkspaceCompanyCardsSettingsPage';

export default WorkspaceCompanyCardsSettingsPage;
