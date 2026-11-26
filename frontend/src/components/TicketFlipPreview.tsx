import {
  DESIGN_LAYOUTS,
  type MyTicket,
  type TicketTextValues,
} from "@mind-do/shared";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import TicketRenderer from "./TicketRenderer";

const colors = { text: "#252B45", secondary: "#78819A" };
const legacyPhotoHeightRatio = 0.39;
const legacyTicketCaptionHeight = 25;
const legacyTicketPadding = 6;
const legacyTicketBorder = 1;

function formattedDate(date: string) {
  return date.replace(/-/g, ".");
}

export function PersonalPhotoTicket({
  ticket,
  width,
}: {
  ticket: MyTicket;
  width: number;
}) {
  const photos = ticket.photos.map((photo) => photo.url);
  const photoHeight = width * legacyPhotoHeightRatio;
  return (
    <View style={[styles.personalPhotoTicket, { width }]}>
      <View style={[styles.personalPhotoCollage, { height: photoHeight }]}>
        {photos.length === 1 ? (
          <Image
            source={{ uri: photos[0] }}
            style={styles.personalPhotoSingle}
            resizeMode="cover"
          />
        ) : photos.length > 1 ? (
          <>
            <Image
              source={{ uri: photos[0] }}
              style={styles.personalPhotoMain}
              resizeMode="cover"
            />
            <View style={styles.personalPhotoSide}>
              {photos.slice(1).map((uri, index) => (
                <Image
                  key={`${index}-${uri}`}
                  source={{ uri }}
                  style={styles.personalPhotoThumb}
                  resizeMode="cover"
                />
              ))}
              {photos.length === 2 && (
                <View style={styles.personalPhotoThumbPlaceholder} />
              )}
            </View>
          </>
        ) : (
          <View style={styles.personalPhotoPlaceholder}>
            <Text style={styles.personalPhotoPlaceholderText}>
              사진이 없어요
            </Text>
          </View>
        )}
      </View>
      <View style={styles.personalPhotoCaptionRow}>
        <Text style={styles.personalPhotoTitle} numberOfLines={1}>
          나의 티켓
        </Text>
        <Text style={styles.personalPhotoDate}>
          {formattedDate(ticket.visitDate)}
        </Text>
      </View>
    </View>
  );
}

function PersonalTicketBack({
  ticket,
  width,
  height,
}: {
  ticket: MyTicket;
  width: number;
  height: number;
}) {
  return (
    <View style={[styles.personalTicketBack, { width, height }]}>
      <View style={styles.personalTicketBackHeader}>
        <Text style={styles.personalTicketBackLabel}>MEMORY NOTE</Text>
        <Text style={styles.personalTicketBackDate}>
          {formattedDate(ticket.visitDate)}
        </Text>
      </View>
      <ScrollView nestedScrollEnabled>
        <Text style={styles.personalTicketBackMemo}>
          {ticket.memo?.trim() || "이날의 기억을 적어 주세요"}
        </Text>
      </ScrollView>
    </View>
  );
}

export default function TicketFlipPreview({
  ticket,
  values,
  width,
  showingBack,
  onFlip,
}: {
  ticket: MyTicket;
  values: TicketTextValues;
  width: number;
  showingBack: boolean;
  onFlip: () => void;
}) {
  const { w, h } = DESIGN_LAYOUTS.horizontal.ticket;
  const height = ticket.design
    ? width * (h / w)
    : width * legacyPhotoHeightRatio +
      legacyTicketCaptionHeight +
      2 * (legacyTicketPadding + legacyTicketBorder);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={showingBack ? "티켓 앞면 보기" : "티켓 뒷면 보기"}
      accessibilityHint="티켓을 누르면 앞면과 뒷면이 바뀝니다"
      onPress={onFlip}
      style={({ pressed }) => [
        styles.groupTicketPreview,
        pressed && styles.slotPressed,
      ]}
    >
      {showingBack ? (
        <PersonalTicketBack ticket={ticket} width={width} height={height} />
      ) : ticket.design ? (
        <TicketRenderer
          designId={ticket.design.designId}
          decorations={ticket.decorations}
          photoUris={ticket.photos.map((photo) => photo.url)}
          values={values}
          width={width}
          lieDown
        />
      ) : (
        <PersonalPhotoTicket ticket={ticket} width={width} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slotPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  groupTicketPreview: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  personalPhotoTicket: {
    overflow: "hidden",
    borderRadius: 12,
    backgroundColor: "#F2F3F6",
    padding: legacyTicketPadding,
    borderWidth: legacyTicketBorder,
    borderColor: "#E6E8ED",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 2,
  },
  personalPhotoCollage: {
    width: "100%",
    flexDirection: "row",
    gap: 4,
    overflow: "hidden",
    borderRadius: 7,
    backgroundColor: "#E7E9EF",
  },
  personalPhotoSingle: { width: "100%", height: "100%" },
  personalPhotoMain: { width: "64%", height: "100%", borderRadius: 5 },
  personalPhotoSide: { flex: 1, gap: 4 },
  personalPhotoThumb: { flex: 1, width: "100%", borderRadius: 5 },
  personalPhotoThumbPlaceholder: { flex: 1 },
  personalPhotoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  personalPhotoPlaceholderText: { color: colors.secondary, fontSize: 11 },
  personalPhotoCaptionRow: {
    height: legacyTicketCaptionHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
  },
  personalPhotoTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  personalPhotoDate: { color: colors.secondary, fontSize: 9, marginLeft: 8 },
  personalTicketBack: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B9BDC6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 2,
  },
  personalTicketBackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personalTicketBackLabel: { color: "#3F63E9", fontSize: 8, fontWeight: "700" },
  personalTicketBackDate: { color: colors.secondary, fontSize: 8 },
  personalTicketBackMemo: {
    marginTop: 18,
    color: "#454955",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "left",
  },
});
