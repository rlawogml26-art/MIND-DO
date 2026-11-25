import { useState } from "react";
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
import mascot from "../../assets/memo-re-mascot.png";
import wordmark from "../../assets/memo-re-wordmark.png";

type StoreTab = "home" | "group" | "store" | "my";
type Product = {
  name: string;
  price: string;
  description: string;
  start: number;
  vip?: boolean;
  category?: string;
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

// 후속 Issue #127: 스토어 API 연결 후 서버 목록으로 교체
const DEMO_VIP_MONTHLY_PRICE = "월 5,990원";
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
const stickerCategories = [
  "전체",
  "반짝임",
  "드로잉",
  "젤리",
  "픽셀",
  "레트로",
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
  const openArrivals = () => {
    setPage("arrivals");
  };
  const openCatalog = () => {
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
                {DEMO_VIP_MONTHLY_PRICE} · 스티커
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
              <Pressable onPress={openArrivals} style={styles.categoryButton}>
                <Text style={styles.categoryText}>스티커</Text>
              </Pressable>
            </View>

            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>새로 나온 스티커</Text>
                <Pressable onPress={openArrivals}>
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
          onBack={() => setPage("store")}
          onViewAll={openCatalog}
          onSelectProduct={openProduct}
          onOpenHome={onOpenHome}
          onOpenGroup={onOpenGroup}
          onOpenMy={onOpenMy}
        />
      ) : page === "catalog" ? (
        <DesignStoreScreen
          onBack={() => setPage(catalogReturnPage)}
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
  onBack,
  onViewAll,
  onSelectProduct,
  onOpenHome,
  onOpenGroup,
  onOpenMy,
}: {
  onBack: () => void;
  onViewAll: () => void;
  onSelectProduct: (product: Product) => void;
  onOpenHome: () => void;
  onOpenGroup: () => void;
  onOpenMy: () => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 60) / 2;
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
        <Text style={styles.arrivalsTitle}>새로 나온 스티커</Text>
        <Text style={styles.arrivalsSubtitle}>최근 등록된 디자인</Text>
        <View style={styles.arrivalsSectionHeader}>
          <Text style={styles.arrivalsSectionTitle}>신규 스티커</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onViewAll}
            style={styles.arrivalsViewAll}
          >
            <Text style={styles.arrivalsViewAllText}>전체 스티커</Text>
          </Pressable>
        </View>
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
  onBack,

  onSelectProduct,
  onVip,
  onOpenHome,
  onOpenGroup,
  onOpenMy,
}: {
  onBack: () => void;
  onSelectProduct: (product: Product) => void;
  onVip: () => void;
  onOpenHome: () => void;
  onOpenGroup: () => void;
  onOpenMy: () => void;
}) {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [stickerFilter, setStickerFilter] = useState("전체");
  const cardWidth = (width - 44) / 2;
  const visibleStickers = stickerProducts.filter(
    (product) =>
      (stickerFilter === "전체" || product.category === stickerFilter) &&
      `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );

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
      <ScrollView
        style={styles.catalogScroll}
        contentContainerStyle={styles.catalogContent}
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="??? ??"
          placeholderTextColor="#969AA4"
          style={styles.catalogSearch}
        />
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
        <View style={styles.catalogVipCard}>
          <Text style={styles.catalogVipTitle}>VIP · 모든 스티커</Text>
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
        <Text style={styles.detailSub}>스티커팩 · 12종</Text>
        <Text style={styles.detailDescription}>{product.description}</Text>
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
          스티커 디자인을 자유롭게 이용하고{"\n"}나만의 티켓을 더 다채롭게
          꾸며보세요.
        </Text>
        <View style={styles.vipPerk}>
          <Text style={styles.vipPerkText}>✓ 프리미엄 스티커 무제한</Text>
          <Text style={styles.vipPerkText}>✓ 새로운 디자인 계속 추가</Text>
        </View>
      </View>
      <View style={styles.vipBottom}>
        <Pressable onPress={onBuy} style={styles.purchaseButton}>
          <Text style={styles.purchaseButtonText}>
            {DEMO_VIP_MONTHLY_PRICE}으로 시작하기
          </Text>
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
