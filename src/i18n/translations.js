// ✅ FILE: src/i18n/translations.js

const translations = {
  en: {
    // --- Auth / Navigation ---
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    logging_out: "Logging out…",
    admin: "Admin",
    admin_login: "Admin Login",
    profile: "Profile",
    donate: "Donate",
    items: "Items",
    health: "Health",

    // alias (navbar/pages sometimes use snake_case)
    my_requests: "My Requests",
    // original key kept for backward-compat
    myRequests: "My Requests",

    // --- Dashboard / Labels ---
    adminDashboard: "Admin Dashboard",
    language: "Language",
    welcome: "Welcome to Freebies Japan 👋",
    donateHeader: "Give Unused Items a Second Life ♻️",
    requestHeader: "Find What You Need for Free 🍭",
    loading: "Loading...",
    unauthorized: "Unauthorized",
    email: "Email",
    status: "Status",
    verified: "Verified",
    unverified: "Unverified",
    verifyEmail: "Verify Email",
    sending: "Sending...",

    // --- Profile / Address ---
    defaultDeliveryInfo: "Default Delivery Info",
    zipCode: "ZIP Code",
    address: "Address",
    roomBuilding: "Room/Building",
    phone: "Phone",
    saveChanges: "Save Changes",
    saving: "Saving...",
    profileUpdated: "Profile updated successfully!",
    profileUpdateError: "Failed to update profile.",
    verificationSent: "Verification email sent!",
    verificationFailed: "Failed to send verification email.",
    addressValidationError: "ZIP Code, Address, and Phone are required",
    myProfile: "My Profile",
    selectAvatar: "Select Your Avatar",

    // --- Items / Donate form ---
    itemTitle: "Title",
    itemDescription: "Description",
    itemCategory: "Category",
    itemCondition: "Condition",
    itemDeliveryMethod: "Delivery Method",
    itemImages: "Images",
    itemSubmit: "Request",
    noRequests: "No requests found",
    requestStatusNote: "Note:",
    deliverySummary: "Delivery Summary",
    addDeliveryInfo: "Add Delivery Info",
    edit: "Edit",

    // --- Landing / Onboarding ---
    back: "Back",
    next: "Next",
    skip: "Skip",
    browse_items: "Browse Items",
    donate_item: "Donate an Item",
    landing_title_1: "Welcome to Freebies Japan",
    landing_desc_1:
      "Discover free and premium items donated by the community. Join lotteries for free items or purchase premium with bank deposit.",
    landing_title_2: "Free Items via Lottery",
    landing_desc_2:
      "Request a free item by entering a ticket. Winners are selected fairly when the selection closes.",
    landing_title_3: "Premium Items with Deposit",
    landing_desc_3:
      "See bank details, pay by deposit, and report your payment. Admins verify and notify you when it’s ready.",
  },

  ja: {
    // --- Auth / Navigation ---
    login: "ログイン",
    signup: "新規登録",
    logout: "ログアウト",
    logging_out: "ログアウト中…",
    admin: "管理",
    admin_login: "管理者ログイン",
    profile: "プロフィール",
    donate: "寄付する",
    items: "アイテム一覧",
    health: "ヘルスチェック",

    // alias + original
    
"My Activity": "マイアクティビティ",

    // --- Dashboard / Labels ---
    adminDashboard: "管理者ダッシュボード",
    language: "言語",
    welcome: "Freebies Japan へようこそ 👋",
    donateHeader: "不要なアイテムに新たな命を ♻️",
    requestHeader: "無料で必要なものを見つけよう 🍭",
    loading: "読み込み中...",
    unauthorized: "許可されていません",
    email: "メールアドレス",
    status: "ステータス",
    verified: "確認済み",
    unverified: "未確認",
    verifyEmail: "メールを確認",
    sending: "送信中...",

    // --- Profile / Address ---
    defaultDeliveryInfo: "配送情報",
    zipCode: "郵便番号",
    address: "住所",
    roomBuilding: "部屋/建物名",
    phone: "電話番号",
    saveChanges: "変更を保存",
    saving: "保存中...",
    profileUpdated: "プロフィールを更新しました！",
    profileUpdateError: "プロフィールの更新に失敗しました。",
    verificationSent: "確認メールを送信しました！",
    verificationFailed: "確認メールの送信に失敗しました。",
    addressValidationError: "郵便番号、住所、電話番号は必須です。",
    myProfile: "マイプロフィール",
    selectAvatar: "アバターを選択してください",


    
    // --- Items / Donate form ---
    itemTitle: "タイトル",
    itemDescription: "説明",
    itemCategory: "カテゴリ",
    itemCondition: "状態",
    itemDeliveryMethod: "配送方法",
    itemImages: "画像",
    itemSubmit: "寄付を送信",
    noRequests: "リクエストが見つかりません",
    requestStatusNote: "注釈:",
    deliverySummary: "配送概要",
    addDeliveryInfo: "配送情報を追加",
    edit: "編集",

    
    // --- Landing / Onboarding ---
    back: "戻る",
    next: "次へ",
    skip: "スキップ",
    browse_items: "アイテムを見る",
    donate_item: "アイテムを寄付する",
    landing_title_1: "Freebies Japan へようこそ",
    landing_desc_1:
      "コミュニティから寄付された無料・プレミアム品を見つけよう。無料品は抽選に参加、プレミアムは振込で購入できます。",
    landing_title_2: "無料アイテムは抽選で",
    landing_desc_2:
      "無料アイテムはチケットを提出して参加。締切後、公平に当選者が選ばれます。",
    landing_title_3: "プレミアムは振込で",
    landing_desc_3:
      "銀行振込の詳細を確認して入金し、支払い報告を送信。管理者が確認後、準備完了の連絡が届きます。",
  },
};

export default translations;
