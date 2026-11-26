import { useState } from "react";
import mascot from "../../assets/memo-re-mascot.png";
import wordmark from "../../assets/memo-re-wordmark.png";
import {
  Alert,
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StoreTab = "home" | "group" | "store" | "my";
type Product = {
  name: string;
  price: string;
  description: string;
  start: number;
  vip?: boolean;
  kind?: "sticker" | "font";
  category?: string;
  sample?: string;
};
type Props = {
  onOpenHome: () => void;
  onOpenGroup: () => void;
  onOpenMy: () => void;
};

const blue = "#0750ED";
const ink = "#282B33";
const muted = "#767A85";
const soft = "#F4F5F7";
/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles these static image paths. */
const stickerAssets: ImageSourcePropType[] = [
  require("../../assets/store/sticker-01.webp"),
  require("../../assets/store/sticker-02.webp"),
  require("../../assets/store/sticker-03.webp"),
  require("../../assets/store/sticker-04.webp"),
  require("../../assets/store/sticker-05.webp"),
  require("../../assets/store/sticker-06.webp"),
  require("../../assets/store/sticker-07.webp"),
  require("../../assets/store/sticker-08.webp"),
  require("../../assets/store/sticker-09.webp"),
  require("../../assets/store/sticker-10.webp"),
  require("../../assets/store/sticker-11.webp"),
  require("../../assets/store/sticker-12.webp"),
  require("../../assets/store/sticker-13.webp"),
  require("../../assets/store/sticker-14.webp"),
  require("../../assets/store/sticker-15.webp"),
  require("../../assets/store/sticker-16.webp"),
  require("../../assets/store/sticker-17.webp"),
  require("../../assets/store/sticker-18.webp"),
  require("../../assets/store/sticker-19.webp"),
  require("../../assets/store/sticker-20.webp"),
  require("../../assets/store/sticker-21.webp"),
  require("../../assets/store/sticker-22.webp"),
  require("../../assets/store/sticker-23.webp"),
  require("../../assets/store/sticker-24.webp"),
  require("../../assets/store/sticker-25.webp"),
  require("../../assets/store/sticker-26.webp"),
  require("../../assets/store/sticker-27.webp"),
  require("../../assets/store/sticker-28.webp"),
  require("../../assets/store/sticker-29.webp"),
  require("../../assets/store/sticker-30.webp"),
  require("../../assets/store/sticker-31.webp"),
  require("../../assets/store/sticker-32.webp"),
  require("../../assets/store/sticker-33.webp"),
  require("../../assets/store/sticker-34.webp"),
  require("../../assets/store/sticker-35.webp"),
  require("../../assets/store/sticker-36.webp"),
];
const collaborationArt = {
  ad_1: require("../../assets/store/ad-1.webp"),
  ad_2: require("../../assets/store/ad-2.webp"),
  hero_1: require("../../assets/store/hero-1.webp"),
  hero_2: require("../../assets/store/hero-2.webp"),
};
/* eslint-enable @typescript-eslint/no-require-imports */

const stickerProducts: Product[] = [
  {
    name: "크롬 셀레스티얼",
    price: "₩3,900",
    description: "메탈릭 별과 달, 오브제 12종",
    start: 30,
    vip: true,
    category: "반짝임",
  },
  {
    name: "고딕 크리스털",
    price: "₩3,900",
    description: "반짝이는 크리스털 스티커 12종",
    start: 24,
    vip: true,
    category: "반짝임",
  },
  {
    name: "핑크 마커 두들",
    price: "₩3,900",
    description: "분홍색 손그림 스티커 12종",
    start: 18,
    vip: true,
    category: "드로잉",
  },
  {
    name: "파스텔 젤리",
    price: "₩3,900",
    description: "말랑한 파스텔 오브제 12종",
    start: 12,
    vip: true,
    category: "젤리",
  },
  {
    name: "픽셀 챗",
    price: "₩3,900",
    description: "픽셀 말풍선 스티커 12종",
    start: 6,
    vip: true,
    category: "픽셀",
  },
  {
    name: "레트로 테크 프레임",
    price: "₩3,900",
    description: "기억을 꾸미는 레트로 프레임 12종",
    start: 0,
    vip: true,
    category: "레트로",
  },
];
const fontProducts = [
  {
    name: "모리 둥근 글씨",
    sample: "오늘의 기억을\n오래 간직해요",
    description: "부드럽고 둥근 느낌의 폰트",
  },
  {
    name: "기록의 온도",
    sample: "우리의 순간을\n차곡차곡 기록",
    description: "차분한 분위기의 기록용 폰트",
  },
];
const catalogFonts = [
  {
    name: "오늘의 명조",
    sample: "오늘을\n기억해",
    description: "차분한 명조체 폰트",
  },
  {
    name: "메모 산스",
    sample: "소중한\n우리의 날",
    description: "또렷하고 단정한 산스 폰트",
  },
];
const stickerCategories = [
  "전체",
  "반짝임",
  "드로잉",
  "젤리",
  "픽셀",
  "레트로",
];
const fontMoods = [
  "깔끔·모던",
  "귀여움·발랄함",
  "감성·손글씨",
  "강렬·굵음",
  "고급·차분함",
];

export default function StoreScreen({
  onOpenHome,
  onOpenGroup,
  onOpenMy,
}: Props) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState<
    "store" | "arrivals" | "catalog" | "product" | "vip" | "collaboration"
  >("store");
  const [catalogCategory, setCatalogCategory] = useState<"sticker" | "font">(
    "sticker",
  );
  const [catalogReturnPage, setCatalogReturnPage] = useState<
    "store" | "arrivals" | "collaboration"
  >("store");
  const [productReturnPage, setProductReturnPage] = useState<
    "store" | "arrivals" | "catalog" | "collaboration"
  >("store");
  const [vipReturnPage, setVipReturnPage] = useState<
    "store" | "arrivals" | "catalog" | "collaboration"
  >("store");
  const [selectedProduct, setSelectedProduct] = useState<Product>(
    stickerProducts[0],
  );
  const cardWidth = (width - 60) / 2;

  const openProduct = (product: Product) => {
    setProductReturnPage(
      page === "catalog" || page === "collaboration" || page === "arrivals"
        ? page
        : "store",
    );
    setSelectedProduct(product);
    setPage("product");
  };
  const openVip = () => {
    setVipReturnPage(
      page === "product"
        ? productReturnPage
        : page === "catalog" || page === "collaboration" || page === "arrivals"
          ? page
          : "store",
    );
    setPage("vip");
  };
  const openArrivals = (category: "sticker" | "font") => {
    setCatalogCategory(category);
    setPage("arrivals");
  };
  const openCatalog = (category: "sticker" | "font") => {
    setCatalogCategory(category);
    setCatalogReturnPage(
      page === "arrivals"
        ? "arrivals"
        : page === "collaboration"
          ? "collaboration"
          : "store",
    );
    setPage("catalog");
  };
  const restore = () =>
    Alert.alert("구매 복원", "스토어 구매 복원 기능을 준비하고 있어요.");
  const purchase = (name: string) =>
    Alert.alert("구매", `${name} 결제 기능을 준비하고 있어요.`);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {page === "store" ? (
        <>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topBar}>
              <Image
                source={wordmark}
                style={styles.logo}
                resizeMode="contain"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="알림"
                onPress={() => Alert.alert("알림", "새로운 알림이 없어요.")}
                hitSlop={12}
                style={styles.restoreButton}
              >
                <View style={styles.bellIcon}>
                  <View style={styles.bellHandle} />
                  <View style={styles.bellBody} />
                  <View style={styles.bellBase} />
                  <View style={styles.bellClapper} />
                </View>
              </Pressable>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.pageTitle}>스토어</Text>
              <Pressable onPress={restore}>
                <Text style={styles.restoreText}>구매 복원</Text>
              </Pressable>
            </View>

            <View style={styles.vipCard}>
              <Image
                source={mascot}
                style={styles.vipMascot}
                resizeMode="contain"
              />
              <Text style={styles.vipEyebrow}>MEMO:RE VIP</Text>
              <Text style={styles.vipHeadline}>모든 디자인 제한 없이</Text>
              <Text style={styles.vipDescription}>
                월 5,990원 · 스티커와 폰트
              </Text>
              <View style={styles.vipActionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={openVip}
                  style={styles.vipButton}
                >
                  <Text style={styles.vipButtonText}>VIP 알아보기</Text>
                </Pressable>
                <Text style={styles.billingText}>월간 / 연간</Text>
              </View>
            </View>

            <View style={styles.categoryRow}>
              <Pressable
                onPress={() => openCatalog("sticker")}
                style={styles.categoryButton}
              >
                <Text style={styles.categoryText}>스티커</Text>
              </Pressable>
              <Pressable
                onPress={() => openCatalog("font")}
                style={styles.categoryButton}
              >
                <Text style={styles.categoryText}>폰트</Text>
              </Pressable>
            </View>

            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>새로 나온 스티커</Text>
                <Pressable onPress={() => openArrivals("sticker")}>
                  <Text style={styles.seeAll}>전체 보기</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productRow}
              >
                {stickerProducts.slice(0, 2).map((product) => (
                  <StickerCard
                    key={product.name}
                    product={product}
                    width={cardWidth}
                    onPress={() => openProduct(product)}
                  />
                ))}
              </ScrollView>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>새로 나온 폰트</Text>
                <Pressable onPress={() => openArrivals("font")}>
                  <Text style={styles.seeAll}>전체 보기</Text>
                </Pressable>
              </View>
              <View style={styles.fontRow}>
                {fontProducts.map((font, index) => (
                  <Pressable
                    key={font.name}
                    onPress={() =>
                      openProduct({
                        name: font.name,
                        price: "₩2,900",
                        description: font.description,
                        start: index * 6,
                        vip: true,
                        kind: "font",
                        sample: font.sample,
                      })
                    }
                    style={[styles.fontCard, { width: cardWidth }]}
                  >
                    <Text
                      style={[
                        styles.fontSample,
                        index === 1 && styles.fontSampleSerif,
                      ]}
                    >
                      {font.sample}
                    </Text>
                    <Text style={styles.fontName}>{font.name}</Text>
                    <Text style={styles.fontPrice}>₩2,900</Text>
                  </Pressable>
                ))}
              </View>
              <CollaborationAdCard onPress={() => setPage("collaboration")} />
            </View>
          </ScrollView>
          <BottomNavigation
            activeTab="store"
            onSelect={(tab) => {
              if (tab === "home") onOpenHome();
              else if (tab === "group") onOpenGroup();
              else if (tab === "my") onOpenMy();
            }}
          />
        </>
      ) : page === "arrivals" ? (
        <NewArrivalsScreen
          category={catalogCategory}
          onCategoryChange={setCatalogCategory}
          onBack={() => setPage("store")}
          onViewAll={() => openCatalog(catalogCategory)}
          onSelectProduct={openProduct}
          onOpenHome={onOpenHome}
          onOpenGroup={onOpenGroup}
          onOpenMy={onOpenMy}
        />
      ) : page === "catalog" ? (
        <DesignStoreScreen
          initialTab={catalogCategory}
          onBack={() => setPage(catalogReturnPage)}
          onTabChange={setCatalogCategory}
          onSelectProduct={openProduct}
          onVip={openVip}
          onOpenHome={onOpenHome}
          onOpenGroup={onOpenGroup}
          onOpenMy={onOpenMy}
        />
      ) : page === "collaboration" ? (
        <CollaborationScreen
          onBack={() => setPage("store")}
          onSelectProduct={openProduct}
          onStickerStore={() => {
            setCatalogCategory("sticker");
            setCatalogReturnPage("collaboration");
            setPage("catalog");
          }}
          onOpenHome={onOpenHome}
          onOpenGroup={onOpenGroup}
          onOpenMy={onOpenMy}
        />
      ) : page === "product" ? (
        <ProductDetails
          product={selectedProduct}
          width={width}
          onBack={() => setPage(productReturnPage)}
          onBuy={() => purchase(selectedProduct.name)}
          onVip={openVip}
        />
      ) : (
        <VipDetails
          onBack={() => setPage(vipReturnPage)}
          onBuy={() => purchase("MEMO:RE VIP")}
        />
      )}
    </SafeAreaView>
  );
}

function CollaborationAdCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.collabAdCard, pressed && styles.pressed]}
    >
      <Text style={styles.collabAdLabel}>COLLABORATION · AD</Text>
      <Text style={styles.collabAdTitle}>memo:re × ARTIST</Text>
      <Text style={styles.collabAdCopy}>일상에 더하는 작은 취향</Text>
      <View style={styles.collabAdArtRow}>
        <Image
          source={collaborationArt.ad_1}
          style={styles.collabAdArt}
          resizeMode="contain"
        />
        <Image
          source={collaborationArt.ad_2}
          style={styles.collabAdArt}
          resizeMode="contain"
        />
      </View>
    </Pressable>
  );
}

function NewArrivalsScreen({
  category,
  onCategoryChange,
  onBack,
  onViewAll,
  onSelectProduct,
  onOpenHome,
  onOpenGroup,
  onOpenMy,
}: {
  category: "sticker" | "font";
  onCategoryChange: (category: "sticker" | "font") => void;
  onBack: () => void;
  onViewAll: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenHome: () => void;
  onOpenGroup: () => void;
  onOpenMy: () => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 60) / 2;
  const showingStickers = category === "sticker";
  return (
    <View style={styles.arrivalsScreen}>
      <View style={styles.arrivalsHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="스토어로 돌아가기"
          onPress={onBack}
          style={styles.catalogBack}
        >
          <Text style={styles.catalogBackText}>‹</Text>
        </Pressable>
        <Text style={styles.arrivalsHeaderTitle}>신상 디자인</Text>
        <View style={styles.catalogBack} />
      </View>
      <ScrollView
        style={styles.arrivalsScroll}
        contentContainerStyle={styles.arrivalsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.arrivalsEyebrow}>NEW ARRIVALS</Text>
        <Text style={styles.arrivalsTitle}>
          새로 나온 {showingStickers ? "스티커" : "폰트"}
        </Text>
        <Text style={styles.arrivalsSubtitle}>최근 등록된 디자인</Text>
        <View style={styles.arrivalsTabs}>
          {(["sticker", "font"] as const).map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: category === tab }}
              onPress={() => onCategoryChange(tab)}
              style={styles.arrivalsTab}
            >
              <Text
                style={[
                  styles.arrivalsTabText,
                  category === tab && styles.arrivalsTabTextActive,
                ]}
              >
                {tab === "sticker" ? "스티커" : "폰트"}
              </Text>
              <View
                style={[
                  styles.arrivalsTabLine,
                  category === tab && styles.arrivalsTabLineActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
        <View style={styles.arrivalsSectionHeader}>
          <Text style={styles.arrivalsSectionTitle}>
            신규 {showingStickers ? "스티커" : "폰트"}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onViewAll}
            style={styles.arrivalsViewAll}
          >
            <Text style={styles.arrivalsViewAllText}>
              전체 {showingStickers ? "스티커" : "폰트"}
            </Text>
          </Pressable>
        </View>
        {showingStickers ? (
          <View style={styles.arrivalsGrid}>
            {stickerProducts.map((product) => (
              <StickerCard
                key={product.name}
                product={product}
                width={cardWidth}
                onPress={() => onSelectProduct(product)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.arrivalsGrid}>
            {fontProducts.map((font, index) => (
              <Pressable
                key={font.name}
                onPress={() =>
                  onSelectProduct({
                    name: font.name,
                    price: "₩2,900",
                    description: font.description,
                    start: index * 6,
                    vip: true,
                    kind: "font",
                    sample: font.sample,
                  })
                }
                style={[styles.fontCard, { width: cardWidth }]}
              >
                <Text
                  style={[
                    styles.fontSample,
                    index === 1 && styles.fontSampleSerif,
                  ]}
                >
                  {font.sample}
                </Text>
                <Text style={styles.fontName}>{font.name}</Text>
                <Text style={styles.fontPrice}>₩2,900</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <BottomNavigation
        activeTab="store"
        onSelect={(tab) => {
          if (tab === "home") onOpenHome();
          else if (tab === "group") onOpenGroup();
          else if (tab === "my") onOpenMy();
        }}
      />
    </View>
  );
}

function CollaborationScreen({
  onBack,
  onSelectProduct,
  onStickerStore,
  onOpenHome,
  onOpenGroup,
  onOpenMy,
}: {
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onStickerStore: () => void;
  onOpenHome: () => void;
  onOpenGroup: () => void;
  onOpenMy: () => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 60) / 2;
  const collaborationProducts = stickerProducts.filter(
    (product) =>
      product.name === "핑크 마커 두들" || product.name === "파스텔 젤리",
  );
  return (
    <View style={styles.collabScreen}>
      <View style={styles.collabHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={onBack}
          style={styles.collabBack}
        >
          <Text style={styles.collabBackText}>‹</Text>
        </Pressable>
        <Text style={styles.collabHeaderTitle}>콜라보</Text>
        <View style={styles.collabBack} />
      </View>
      <ScrollView
        style={styles.collabScroll}
        contentContainerStyle={styles.collabContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.collabHero, { width: width - 48 }]}>
          <Image
            source={collaborationArt.hero_1}
            style={styles.collabHeroStar}
            resizeMode="contain"
          />
          <Image
            source={collaborationArt.hero_2}
            style={styles.collabHeroHeart}
            resizeMode="contain"
          />
          <Text style={styles.collabHeroMark}>MEMO:RE × ARTIST</Text>
        </View>
        <Text style={styles.collabDetailLabel}>COLLABORATION · AD</Text>
        <Text style={styles.collabDetailTitle}>
          일상에 더하는{"\n"}작은 취향
        </Text>
        <Text style={styles.collabPartner}>memo:re × ARTIST</Text>
        <Text style={styles.collabDescription}>티켓을 위한 콜라보 디자인</Text>
        <View style={styles.collabProductsHeading}>
          <Text style={styles.collabProductsTitle}>콜라보 디자인</Text>
          <Text style={styles.collabProductsType}>스티커</Text>
        </View>
        <View style={styles.collabProductRow}>
          {collaborationProducts.map((product) => (
            <StickerCard
              key={product.name}
              product={product}
              width={cardWidth}
              compact
              onPress={() => onSelectProduct(product)}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onStickerStore}
          style={styles.collabStoreButton}
        >
          <Text style={styles.collabStoreButtonText}>스티커 스토어</Text>
        </Pressable>
      </ScrollView>
      <BottomNavigation
        activeTab="store"
        onSelect={(tab) => {
          if (tab === "home") onOpenHome();
          else if (tab === "group") onOpenGroup();
          else if (tab === "my") onOpenMy();
        }}
      />
    </View>
  );
}

function DesignStoreScreen({
  initialTab,
  onBack,
  onTabChange,
  onSelectProduct,
  onVip,
  onOpenHome,
  onOpenGroup,
  onOpenMy,
}: {
  initialTab: "sticker" | "font";
  onBack: () => void;
  onTabChange: (tab: "sticker" | "font") => void;
  onSelectProduct: (product: Product) => void;
  onVip: () => void;
  onOpenHome: () => void;
  onOpenGroup: () => void;
  onOpenMy: () => void;
}) {
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState(initialTab);
  const [query, setQuery] = useState("");
  const [stickerFilter, setStickerFilter] = useState("전체");
  const [fontMood, setFontMood] = useState("고급·차분함");
  const [fontKeyword, setFontKeyword] = useState("");
  const cardWidth = (width - 44) / 2;
  const visibleStickers = stickerProducts.filter(
    (product) =>
      (stickerFilter === "전체" || product.category === stickerFilter) &&
      `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const visibleFonts = catalogFonts.filter((font) =>
    `${font.name} ${font.sample} ${font.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const moodKeywords: Record<string, string[]> = {
    "깔끔·모던": ["산세리프", "단정한", "미니멀", "가독성"],
    "귀여움·발랄함": ["둥근", "통통한", "귀여운", "밝은"],
    "감성·손글씨": ["손글씨", "일기", "부드러운", "따뜻한"],
    "강렬·굵음": ["두꺼운", "강조", "선명한", "개성"],
    "고급·차분함": ["명조", "세리프", "고전", "격식", "우아한"],
  };
  const toggleTab = (next: "sticker" | "font") => {
    setTab(next);
    onTabChange(next);
  };

  return (
    <View style={styles.catalogScreen}>
      <View style={styles.catalogHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={onBack}
          style={styles.catalogBack}
        >
          <Text style={styles.catalogBackText}>‹</Text>
        </Pressable>
        <Text style={styles.catalogHeaderTitle}>디자인 스토어</Text>
        <View style={styles.catalogBack} />
      </View>
      <View style={styles.catalogTabs}>
        {(["sticker", "font"] as const).map((key) => (
          <Pressable
            key={key}
            onPress={() => toggleTab(key)}
            style={styles.catalogTab}
          >
            <Text
              style={[
                styles.catalogTabText,
                tab === key && styles.catalogTabTextActive,
              ]}
            >
              {key === "sticker" ? "스티커" : "폰트"}
            </Text>
            <View
              style={[
                styles.catalogTabLine,
                tab === key && styles.catalogTabLineActive,
              ]}
            />
          </Pressable>
        ))}
      </View>
      <ScrollView
        style={styles.catalogScroll}
        contentContainerStyle={styles.catalogContent}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={
            tab === "sticker"
              ? "검색   디자인 검색"
              : "검색   폰트명·분위기로 검색"
          }
          placeholderTextColor="#969AA4"
          style={styles.catalogSearch}
        />
        {tab === "sticker" ? (
          <>
            <Text style={styles.catalogTaxonomy}>
              크롬 · 드로잉 · 젤리 · 픽셀 · 레트로
            </Text>
            <View style={styles.filterGrid}>
              {stickerCategories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setStickerFilter(category)}
                  style={[
                    styles.filterChip,
                    stickerFilter === category && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      stickerFilter === category && styles.filterChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.catalogSectionHeader}>
              <Text style={styles.catalogSectionTitle}>스티커팩</Text>
              <Text style={styles.catalogMuted}>전체</Text>
            </View>
            <View style={styles.catalogProductGrid}>
              {visibleStickers.map((product) => (
                <StickerCard
                  key={product.name}
                  product={product}
                  width={cardWidth}
                  compact
                  onPress={() => onSelectProduct(product)}
                />
              ))}
            </View>
            {visibleStickers.length === 0 && (
              <Text style={styles.catalogEmpty}>검색 결과가 없어요.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.filterTitle}>분위기·느낌</Text>
            <View style={styles.moodGrid}>
              {fontMoods.map((mood) => (
                <Pressable
                  key={mood}
                  onPress={() => {
                    setFontMood(mood);
                    setFontKeyword("");
                  }}
                  style={[
                    styles.moodChip,
                    fontMood === mood && styles.moodChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.moodChipText,
                      fontMood === mood && styles.moodChipTextActive,
                    ]}
                  >
                    {mood}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.keywordHeading}>
              <Text style={styles.keywordTitle}>{fontMood} 검색어</Text>
              <Pressable onPress={() => setFontKeyword("")}>
                <Text style={styles.resetText}>초기화</Text>
              </Pressable>
            </View>
            <View style={styles.keywordRow}>
              {moodKeywords[fontMood].map((keyword) => (
                <Pressable
                  key={keyword}
                  onPress={() =>
                    setFontKeyword(fontKeyword === keyword ? "" : keyword)
                  }
                  style={[
                    styles.keywordChip,
                    fontKeyword === keyword && styles.keywordChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.keywordText,
                      fontKeyword === keyword && styles.keywordTextActive,
                    ]}
                  >
                    {keyword}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.catalogSectionHeader}>
              <View>
                <Text style={styles.catalogSectionTitle}>전체 폰트</Text>
                <Text style={styles.catalogMuted}>{visibleFonts.length}개</Text>
              </View>
            </View>
            {visibleFonts.length === 0 && (
              <Text style={styles.catalogEmpty}>검색 결과가 없어요.</Text>
            )}
            <Text style={styles.fontUsageHint}>티켓 뒷면 메모에 적용</Text>
            <View style={styles.catalogProductGrid}>
              {visibleFonts.map((font, index) => (
                <CatalogFontCard
                  key={font.name}
                  font={font}
                  index={index}
                  width={cardWidth}
                  onPress={() =>
                    onSelectProduct({
                      name: font.name,
                      price: "₩2,900",
                      description: font.description,
                      start: index,
                      vip: true,
                      kind: "font",
                      sample: font.sample,
                    })
                  }
                />
              ))}
            </View>
          </>
        )}
        <View style={styles.catalogVipCard}>
          <Text style={styles.catalogVipTitle}>VIP · 모든 스티커와 폰트</Text>
          <Text style={styles.catalogMuted}>구독 기간 동안 무제한 이용</Text>
          <Pressable onPress={onVip} style={styles.catalogVipButton}>
            <Text style={styles.catalogVipButtonText}>VIP 혜택 보기</Text>
          </Pressable>
        </View>
      </ScrollView>
      <BottomNavigation
        activeTab="store"
        onSelect={(next) => {
          if (next === "home") onOpenHome();
          else if (next === "group") onOpenGroup();
          else if (next === "my") onOpenMy();
        }}
      />
    </View>
  );
}

function CatalogFontCard({
  font,
  index,
  width,
  onPress,
}: {
  font: (typeof catalogFonts)[number];
  index: number;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.catalogFontCard,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.catalogFontSample,
          index === 0 && styles.catalogFontSerif,
        ]}
      >
        {font.sample}
      </Text>
      <Text style={styles.productMeta}>FONT · VIP 이용 가능</Text>
      <Text style={styles.catalogFontName}>{font.name}</Text>
      <Text style={styles.catalogMuted}>스토어 가격 확인</Text>
    </Pressable>
  );
}

function StickerCard({
  product,
  width,
  compact = false,
  onPress,
}: {
  product: Product;
  width: number;
  compact?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.productCard,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={compact ? styles.catalogStickerPreview : styles.stickerPreview}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={styles.stickerCell}>
            <Image
              source={stickerAssets[product.start + i]}
              style={styles.stickerImage}
              resizeMode="contain"
            />
          </View>
        ))}
      </View>
      <Text style={styles.productMeta}>12종 · VIP 이용 가능</Text>
      <Text numberOfLines={1} style={styles.productName}>
        {product.name}
      </Text>
      <Text style={styles.productPrice}>{product.price}</Text>
    </Pressable>
  );
}

function ProductDetails({
  product,
  width,
  onBack,
  onBuy,
  onVip,
}: {
  product: Product;
  width: number;
  onBack: () => void;
  onBuy: () => void;
  onVip: () => void;
}) {
  const cardWidth = width - 48;
  return (
    <View style={styles.detailScreen}>
      <View style={styles.detailHeader}>
        <Pressable
          onPress={onBack}
          accessibilityLabel="뒤로"
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.detailHeaderTitle}>{product.name}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.productMeta}>
          {product.vip ? "개별 구매 · VIP 이용 가능" : "개별 구매"}
        </Text>
        <Text style={styles.detailTitle}>{product.name}</Text>
        <Text style={styles.detailSub}>
          {product.kind === "font" ? "폰트" : "스티커팩 · 12종"}
        </Text>
        <Text style={styles.detailDescription}>{product.description}</Text>
        {product.kind === "font" ? (
          <View style={[styles.fontDetailPreview, { width: cardWidth }]}>
            <Text style={styles.fontDetailLabel}>MEMO:RE</Text>
            <Text style={styles.fontDetailSample}>
              {product.sample || "우리의 순간을\n오래 간직해요"}
            </Text>
            <Text style={styles.fontDetailDate}>2026.11.24</Text>
          </View>
        ) : (
          <View style={[styles.detailStickerGrid, { width: cardWidth }]}>
            {Array.from({ length: 12 }, (_, i) => (
              <View key={i} style={styles.detailStickerCell}>
                <Image
                  source={
                    stickerAssets[
                      (product.start + (i % 6)) % stickerAssets.length
                    ]
                  }
                  style={styles.detailStickerImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={styles.purchaseBar}>
        <View>
          <Text style={styles.purchasePrice}>{product.price}</Text>
          <Text style={styles.purchaseFine}>모든 디자인 무제한</Text>
        </View>
        <Pressable onPress={onBuy} style={styles.purchaseButton}>
          <Text style={styles.purchaseButtonText}>
            {product.price} 구매하기
          </Text>
        </Pressable>
      </View>
      <Pressable onPress={onVip} style={styles.vipAlt}>
        <Text style={styles.vipAltText}>VIP 알아보기</Text>
      </Pressable>
    </View>
  );
}

function VipDetails({
  onBack,
  onBuy,
}: {
  onBack: () => void;
  onBuy: () => void;
}) {
  return (
    <View style={styles.detailScreen}>
      <View style={styles.detailHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.detailHeaderTitle}>MEMO:RE VIP</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.vipDetailBody}>
        <Image
          source={mascot}
          style={styles.vipDetailMascot}
          resizeMode="contain"
        />
        <Text style={styles.vipEyebrow}>MEMO:RE VIP</Text>
        <Text style={styles.vipDetailTitle}>
          모든 디자인을{"\n"}제한 없이 사용해요
        </Text>
        <Text style={styles.vipDetailCopy}>
          스티커와 폰트 디자인을 자유롭게 이용하고{"\n"}나만의 티켓을 더
          다채롭게 꾸며보세요.
        </Text>
        <View style={styles.vipPerk}>
          <Text style={styles.vipPerkText}>✓ 프리미엄 스티커 무제한</Text>
          <Text style={styles.vipPerkText}>✓ 모든 폰트 이용 가능</Text>
          <Text style={styles.vipPerkText}>✓ 새로운 디자인 계속 추가</Text>
        </View>
      </View>
      <View style={styles.vipBottom}>
        <Pressable onPress={onBuy} style={styles.purchaseButton}>
          <Text style={styles.purchaseButtonText}>월 5,990원으로 시작하기</Text>
        </Pressable>
        <Text style={styles.purchaseFine}>
          언제든지 구독을 관리할 수 있어요
        </Text>
      </View>
    </View>
  );
}

function BottomNavigation({
  activeTab,
  onSelect,
}: {
  activeTab: StoreTab;
  onSelect: (tab: StoreTab) => void;
}) {
  const tabs: { key: StoreTab; label: string }[] = [
    { key: "home", label: "홈" },
    { key: "group", label: "그룹" },
    { key: "store", label: "스토어" },
    { key: "my", label: "마이" },
  ];
  return (
    <View style={styles.navOuter}>
      <View style={styles.navBar}>
        {tabs.map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: activeTab === key }}
            onPress={() => onSelect(key)}
            style={({ pressed }) => [
              styles.navItem,
              pressed && styles.navPressed,
            ]}
          >
            <NavIcon tab={key} />
            <Text
              style={[styles.navLabel, activeTab === key && styles.navActive]}
            >
              {label}
            </Text>
            <View
              style={[
                styles.navMarker,
                activeTab !== key && styles.navMarkerHidden,
              ]}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function NavIcon({ tab }: { tab: StoreTab }) {
  return (
    <View style={styles.navIcon}>
      {tab === "home" && (
        <>
          <View style={styles.homeRoof} />
          <View style={styles.homeBody}>
            <View style={styles.homeDoor} />
          </View>
        </>
      )}
      {tab === "group" && (
        <View style={styles.ticketIcon}>
          <View style={styles.ticketHoleLeft} />
          <View style={styles.ticketLine} />
          <View style={styles.ticketHoleRight} />
        </View>
      )}
      {tab === "store" && (
        <>
          <View style={styles.storeRoof}>
            <View style={styles.storeStripe} />
            <View style={styles.storeStripe} />
          </View>
          <View style={styles.storeBody}>
            <View style={styles.storeDoor} />
          </View>
        </>
      )}
      {tab === "my" && (
        <>
          <View style={styles.personHead} />
          <View style={styles.personBody} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flex: 1 },
  content: { paddingBottom: 20 },
  topBar: {
    height: 56,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { width: 120, height: 30 },
  restoreButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    width: 20,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  bellHandle: {
    position: "absolute",
    top: 1,
    width: 4,
    height: 3,
    borderTopWidth: 1.6,
    borderLeftWidth: 1.6,
    borderRightWidth: 1.6,
    borderColor: "#14233D",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  bellBody: {
    position: "absolute",
    top: 4,
    width: 14,
    height: 13,
    borderWidth: 1.6,
    borderBottomWidth: 0,
    borderColor: "#14233D",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  bellBase: {
    position: "absolute",
    bottom: 3,
    width: 18,
    height: 1.6,
    borderRadius: 1,
    backgroundColor: "#14233D",
  },
  bellClapper: {
    position: "absolute",
    bottom: 0,
    width: 3,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#14233D",
  },
  titleRow: {
    paddingHorizontal: 18,
    marginTop: 0,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  pageTitle: { color: ink, fontSize: 22, lineHeight: 30, fontWeight: "700" },
  restoreText: { fontSize: 10, color: muted },
  vipCard: {
    marginHorizontal: 24,
    minHeight: 188,
    borderRadius: 18,
    backgroundColor: soft,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    overflow: "hidden",
  },
  vipMascot: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 68,
    height: 52,
  },
  vipEyebrow: {
    color: blue,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 22,
  },
  vipHeadline: { color: ink, fontSize: 19, lineHeight: 26, fontWeight: "700" },
  vipDescription: { color: muted, fontSize: 11, marginTop: 6 },
  vipActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  vipButton: {
    height: 52,
    width: 128,
    borderRadius: 16,
    backgroundColor: blue,
    alignItems: "center",
    justifyContent: "center",
  },
  vipButtonText: { color: "white", fontSize: 14, fontWeight: "600" },
  billingText: { color: muted, fontSize: 9, marginRight: 1 },
  categoryRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: "#C6D6FF",
    borderRadius: 16,
    height: 52,
    minWidth: 68,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: { color: blue, fontSize: 14 },
  sectionHeader: {
    marginHorizontal: 24,
    marginTop: 0,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: ink, fontSize: 18, fontWeight: "700" },
  seeAll: { color: blue, fontSize: 11, fontWeight: "600" },
  productRow: { gap: 12, paddingHorizontal: 24, paddingBottom: 20 },
  productCard: { gap: 6 },
  pressed: { opacity: 0.76 },
  stickerPreview: {
    height: 144,
    borderRadius: 16,
    backgroundColor: soft,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 7,
    overflow: "hidden",
  },
  stickerCell: {
    width: "33.333%",
    height: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  stickerImage: { width: "100%", height: "100%" },
  productMeta: { color: blue, fontSize: 10, lineHeight: 14 },
  productName: { color: ink, fontSize: 13, lineHeight: 18 },
  productPrice: { color: ink, fontSize: 14, lineHeight: 20 },
  fontRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  fontCard: {
    backgroundColor: "#FFF4F1",
    borderRadius: 16,
    padding: 12,
    minHeight: 158,
    justifyContent: "space-between",
  },
  fontSample: {
    color: "#313B5C",
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
  },
  fontSampleSerif: { fontFamily: "serif", fontWeight: "400" },
  fontName: { color: ink, fontSize: 13 },
  fontPrice: { color: ink, fontSize: 14 },
  arrivalsScreen: { flex: 1, backgroundColor: "#FFFFFF" },
  arrivalsHeader: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  arrivalsHeaderTitle: { color: ink, fontSize: 14, fontWeight: "600" },
  arrivalsScroll: { flex: 1 },
  arrivalsContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  arrivalsEyebrow: {
    color: "#A34F4A",
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  arrivalsTitle: {
    color: ink,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    marginTop: 5,
  },
  arrivalsSubtitle: {
    color: muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 2,
  },
  arrivalsTabs: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 24,
    gap: 14,
  },
  arrivalsTab: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  arrivalsTabText: {
    color: blue,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  arrivalsTabTextActive: { color: blue },
  arrivalsTabLine: {
    position: "absolute",
    bottom: -2,
    left: "50%",
    marginLeft: -24,
    width: 48,
    height: 2,
  },
  arrivalsTabLineActive: { backgroundColor: blue },
  arrivalsSectionHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  arrivalsSectionTitle: { color: ink, fontSize: 16, fontWeight: "700" },
  arrivalsViewAll: {
    minWidth: 112,
    height: 42,
    borderWidth: 1,
    borderColor: "#D5DFF6",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  arrivalsViewAllText: { color: blue, fontSize: 12, fontWeight: "600" },
  arrivalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 18,
  },
  catalogScreen: { flex: 1, backgroundColor: "#FFFFFF" },
  catalogHeader: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catalogBack: { width: 32, height: 36, justifyContent: "center" },
  catalogBackText: { color: "#252B45", fontSize: 30, lineHeight: 34 },
  catalogHeaderTitle: { color: ink, fontSize: 14, fontWeight: "600" },
  catalogTabs: {
    height: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
  },
  catalogTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  catalogTabText: { color: muted, fontSize: 13, fontWeight: "600" },
  catalogTabTextActive: { color: blue },
  catalogTabLine: {
    position: "absolute",
    bottom: -2,
    left: 0,
    right: 0,
    height: 2,
  },
  catalogTabLineActive: { backgroundColor: blue },
  catalogScroll: { flex: 1 },
  catalogContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  catalogSearch: {
    height: 40,
    borderRadius: 11,
    backgroundColor: "#F2F3F6",
    paddingHorizontal: 14,
    color: ink,
    fontSize: 12,
    marginBottom: 10,
  },
  catalogTaxonomy: {
    color: muted,
    fontSize: 10,
    lineHeight: 16,
    marginBottom: 8,
  },
  filterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    width: "31.5%",
    height: 34,
    borderWidth: 1,
    borderColor: "#D8E0F0",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: { borderColor: blue, backgroundColor: blue },
  filterChipText: { color: blue, fontSize: 11 },
  filterChipTextActive: { color: "#FFFFFF", fontWeight: "600" },
  catalogSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 0,
    marginBottom: 10,
  },
  catalogSectionTitle: { color: ink, fontSize: 15, fontWeight: "700" },
  catalogMuted: { color: muted, fontSize: 10, lineHeight: 15 },
  catalogProductGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  catalogStickerPreview: {
    height: 120,
    borderRadius: 15,
    backgroundColor: soft,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 6,
    overflow: "hidden",
  },
  catalogEmpty: {
    color: muted,
    textAlign: "center",
    paddingVertical: 28,
    fontSize: 12,
  },
  filterTitle: {
    color: ink,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 8,
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  moodChip: {
    width: "48%",
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D8E0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  moodChipActive: { backgroundColor: blue, borderColor: blue },
  moodChipText: { color: blue, fontSize: 10 },
  moodChipTextActive: { color: "white", fontWeight: "600" },
  keywordHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
    marginBottom: 8,
  },
  keywordTitle: { color: muted, fontSize: 10 },
  resetText: { color: blue, fontSize: 10 },
  keywordRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  keywordChip: {
    minWidth: 40,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D8E0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  keywordChipActive: { backgroundColor: blue, borderColor: blue },
  keywordText: { color: blue, fontSize: 10 },
  keywordTextActive: { color: "white" },
  fontUsageHint: {
    color: muted,
    fontSize: 10,
    marginTop: -4,
    marginBottom: 12,
  },
  catalogFontCard: { minHeight: 174, gap: 7 },
  catalogFontSample: {
    height: 118,
    borderRadius: 14,
    backgroundColor: "#F9EEEE",
    color: ink,
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 29,
    padding: 12,
    textAlignVertical: "center",
  },
  catalogFontSerif: { fontFamily: "serif", fontWeight: "400" },
  catalogFontName: { color: ink, fontSize: 11, fontWeight: "600" },
  catalogVipCard: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: soft,
    padding: 14,
    gap: 8,
  },
  catalogVipTitle: { color: blue, fontSize: 12, fontWeight: "700" },
  catalogVipButton: {
    marginTop: 2,
    width: 116,
    height: 40,
    borderWidth: 1,
    borderColor: "#C6D6FF",
    borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  catalogVipButtonText: { color: blue, fontSize: 11, fontWeight: "600" },
  collabAdCard: {
    backgroundColor: "#FFF0EC",
    borderRadius: 16,
    padding: 16,
    gap: 3,
    marginTop: 12,
    marginHorizontal: 24,
    minHeight: 182,
  },
  collabAdLabel: {
    color: "#A13B32",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15,
  },
  collabAdTitle: {
    color: ink,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 32,
  },
  collabAdCopy: { color: muted, fontSize: 12, lineHeight: 17 },
  collabAdArtRow: { flexDirection: "row", gap: 8, marginTop: 3 },
  collabAdArt: { width: 90, height: 68, borderRadius: 12 },
  collabScreen: { flex: 1, backgroundColor: "#FFFFFF" },
  collabHeader: {
    height: 56,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  collabBack: { width: 24, height: 36, justifyContent: "center" },
  collabBackText: { color: "#14233D", fontSize: 30, lineHeight: 34 },
  collabHeaderTitle: { color: ink, fontSize: 15, fontWeight: "600" },
  collabScroll: { flex: 1 },
  collabContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  collabHero: {
    height: 240,
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: "#FFF0EC",
  },
  collabHeroStar: {
    position: "absolute",
    left: 0,
    top: 45,
    width: 185,
    height: 170,
  },
  collabHeroHeart: {
    position: "absolute",
    left: 155,
    top: 20,
    width: 185,
    height: 170,
  },
  collabHeroMark: {
    position: "absolute",
    left: 20,
    bottom: 20,
    color: "#A13B32",
    fontSize: 11,
    fontWeight: "700",
  },
  collabDetailLabel: {
    color: "#A13B32",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
  },
  collabDetailTitle: {
    color: ink,
    fontSize: 28,
    lineHeight: 40,
    fontWeight: "700",
    marginTop: -4,
  },
  collabPartner: { color: muted, fontSize: 14, lineHeight: 20 },
  collabDescription: {
    color: ink,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -8,
  },
  collabProductsHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  collabProductsTitle: { color: ink, fontSize: 18, fontWeight: "700" },
  collabProductsType: { color: muted, fontSize: 11 },
  collabProductRow: { flexDirection: "row", gap: 12 },
  collabStoreButton: {
    height: 52,
    width: 124,
    borderWidth: 1,
    borderColor: "#C6D6FF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 2,
  },
  collabStoreButtonText: { color: blue, fontSize: 13, fontWeight: "500" },
  navOuter: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 4 },
  navBar: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    shadowColor: "#303CB5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  navItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: 18,
  },
  navPressed: { opacity: 0.65 },
  navLabel: {
    color: "#7C8292",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
  },
  navActive: { color: "#303CB5", fontWeight: "700" },
  navMarker: {
    position: "absolute",
    bottom: 4,
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#EC806F",
  },
  navMarkerHidden: { opacity: 0 },
  navIcon: {
    width: 30,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  homeRoof: {
    position: "absolute",
    top: 3,
    width: 11,
    height: 11,
    borderTopWidth: 1.8,
    borderLeftWidth: 1.8,
    borderColor: "#29211E",
    transform: [{ rotate: "45deg" }],
  },
  homeBody: {
    position: "absolute",
    bottom: 3,
    width: 14,
    height: 11,
    borderWidth: 1.8,
    borderTopWidth: 0,
    borderColor: "#29211E",
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  homeDoor: {
    width: 3,
    height: 6,
    borderWidth: 1.3,
    borderBottomWidth: 0,
    borderColor: "#29211E",
  },
  ticketIcon: {
    width: 28,
    height: 18,
    borderWidth: 2,
    borderColor: "#29211E",
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  ticketLine: {
    width: 0,
    height: 11,
    borderLeftWidth: 1.4,
    borderStyle: "dashed",
    borderColor: "#29211E",
  },
  ticketHoleLeft: {
    position: "absolute",
    left: -3,
    top: 5,
    width: 6,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  ticketHoleRight: {
    position: "absolute",
    right: -3,
    top: 5,
    width: 6,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  storeRoof: {
    position: "absolute",
    top: 3,
    width: 17,
    height: 6,
    borderWidth: 1.7,
    borderColor: "#29211E",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  storeStripe: { width: 1, height: 5, backgroundColor: "#29211E" },
  storeBody: {
    position: "absolute",
    bottom: 3,
    width: 15,
    height: 10,
    borderWidth: 1.7,
    borderTopWidth: 0,
    borderColor: "#29211E",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  storeDoor: {
    width: 4,
    height: 6,
    borderWidth: 1.3,
    borderBottomWidth: 0,
    borderColor: "#29211E",
  },
  personHead: {
    position: "absolute",
    top: 2,
    width: 7,
    height: 7,
    borderWidth: 1.7,
    borderColor: "#29211E",
    borderRadius: 4,
  },
  personBody: {
    position: "absolute",
    bottom: 2,
    width: 15,
    height: 9,
    borderWidth: 1.7,
    borderBottomWidth: 0,
    borderColor: "#29211E",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  detailScreen: { flex: 1, backgroundColor: "white" },
  detailHeader: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backButton: { width: 32, height: 36, justifyContent: "center" },
  backText: { color: "#14233D", fontSize: 34, lineHeight: 36 },
  detailHeaderTitle: { color: ink, fontSize: 15, fontWeight: "600" },
  headerSpacer: { width: 32 },
  detailContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  detailTitle: {
    color: ink,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "700",
    marginTop: 14,
  },
  detailSub: { color: muted, fontSize: 11, marginTop: 12 },
  detailDescription: {
    color: muted,
    fontSize: 13,
    marginTop: 14,
    marginBottom: 14,
  },
  detailStickerGrid: {
    aspectRatio: 342 / 456,
    borderRadius: 16,
    backgroundColor: soft,
    padding: 9,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  detailStickerCell: {
    width: "33.333%",
    height: "25%",
    alignItems: "center",
    justifyContent: "center",
  },
  detailStickerImage: { width: "100%", height: "100%" },
  fontDetailPreview: {
    height: 330,
    borderRadius: 16,
    backgroundColor: soft,
    padding: 24,
    justifyContent: "space-between",
  },
  fontDetailLabel: { color: blue, fontSize: 12, fontWeight: "700" },
  fontDetailSample: {
    color: ink,
    fontSize: 30,
    lineHeight: 44,
    fontWeight: "600",
  },
  fontDetailDate: { color: muted, fontSize: 13 },
  purchaseBar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  purchasePrice: { color: ink, fontSize: 16, fontWeight: "700" },
  purchaseFine: { color: muted, fontSize: 10, marginTop: 8 },
  purchaseButton: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: blue,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseButtonText: { color: "white", fontSize: 13, fontWeight: "600" },
  vipAlt: {
    alignSelf: "flex-end",
    borderRadius: 16,
    borderColor: "#C6D6FF",
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 14,
    marginRight: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  vipAltText: { color: blue, fontSize: 14 },
  vipDetailBody: { flex: 1, paddingHorizontal: 28, justifyContent: "center" },
  vipDetailMascot: {
    alignSelf: "center",
    height: 120,
    width: 140,
    marginBottom: 28,
  },
  vipDetailTitle: {
    color: ink,
    fontSize: 27,
    fontWeight: "700",
    lineHeight: 38,
    marginBottom: 14,
  },
  vipDetailCopy: { color: muted, fontSize: 14, lineHeight: 22 },
  vipPerk: {
    marginTop: 28,
    padding: 20,
    borderRadius: 16,
    backgroundColor: soft,
    gap: 14,
  },
  vipPerkText: { color: ink, fontSize: 14 },
  vipBottom: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 18,
    alignItems: "center",
    gap: 10,
  },
});
