import RandomDocPlugin from "./index"
import { icons } from "./utils/svg"
import { Dialog, Menu } from "siyuan"
import RandomDocSetting from "./libs/RandomDocSetting.svelte"

/**
 * 顶栏按钮
 *
 * @param pluginInstance - 插件实例
 * @author terwer
 * @version 0.0.1
 * @since 0.0.1
 */
export async function initTopbar(pluginInstance: RandomDocPlugin) {
  const topBarElement = pluginInstance.addTopBar({
    icon: icons.iconTopbar,
    title: pluginInstance.i18n.randomDoc,
    position: "right",
    callback: () => {},
  })

  topBarElement.addEventListener("click", async () => {
    pluginInstance.logger.info("clicked topbar")
  })

  // 添加右键菜单
  topBarElement.addEventListener("contextmenu", () => {
    let rect = topBarElement.getBoundingClientRect()
    // 如果获取不到宽度，则使用更多按钮的宽度
    if (rect.width === 0) {
      rect = document.querySelector("#barMore")?.getBoundingClientRect() as DOMRect
    }
    initContextMenu(pluginInstance, rect)
  })
}

export const showSettingMenu = (pluginInstance: RandomDocPlugin) => {
  const settingId = "siyuan-random-doc-setting"
  const d = new Dialog({
    title: `${pluginInstance.i18n.setting} - ${pluginInstance.i18n.randomDoc}`,
    content: `<div id="${settingId}"></div>`,
    width: pluginInstance.isMobile ? "92vw" : "720px",
  })
  new RandomDocSetting({
    target: document.getElementById(settingId) as HTMLElement,
    props: {
      pluginInstance: pluginInstance,
      dialog: d,
    },
  })
}

const initContextMenu = async (pluginInstance: RandomDocPlugin, rect: DOMRect) => {
  const menu = new Menu("randomDocContextMenu")

  // 设置
  menu.addItem({
    iconHTML: icons.iconSetting,
    label: pluginInstance.i18n.setting,
    click: () => {
      showSettingMenu(pluginInstance)
    },
  })

  if (pluginInstance.isMobile) {
    menu.fullscreen()
  } else {
    menu.open({
      x: rect.right,
      y: rect.bottom,
      isLeft: true,
    })
  }
}
