/*
 * Copyright (c) 2023, Terwer . All rights reserved.
 * DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 * This code is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License version 2 only, as
 * published by the Free Software Foundation.  Terwer designates this
 * particular file as subject to the "Classpath" exception as provided
 * by Terwer in the LICENSE file that accompanied this code.
 *
 * This code is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * version 2 for more details (a copy is included in the LICENSE file that
 * accompanied this code).
 *
 * You should have received a copy of the GNU General Public License version
 * 2 along with this work; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 * Please contact Terwer, Shenzhen, Guangdong, China, youweics@163.com
 * or visit www.terwer.space if you need additional information or have any
 * questions.
 */

import { BaseApi, SiyuanData } from "./base-api"
import { StrUtil } from "zhi-common"

/**
 * 思源笔记服务端API v2.8.9
 *
 * @see {@link https://github.com/siyuan-note/siyuan/blob/master/API_zh_CN.md API}
 *
 * @author terwer
 * @version 0.0.1
 * @since 0.0.1
 */
class KernelApi extends BaseApi {
  /**
   * 列出笔记本
   */
  public async lsNotebooks(): Promise<SiyuanData> {
    return await this.siyuanRequest("/api/notebook/lsNotebooks", {})
  }

  /**
   * 分页获取根文档
   *
   * @param keyword - 关键字
   * @deprecated
   */
  public async getRootBlocksCount(keyword?: string): Promise<number> {
    const stmt = `SELECT COUNT(DISTINCT b.root_id) as count FROM blocks b`
    const data = (await this.sql(stmt)).data as any[]
    return data[0].count
  }

  /**
   * 以id获取思源块信息
   * @param blockId 块ID
   */
  public async getBlockByID(blockId: string): Promise<any> {
    const stmt = `select *
                from blocks
                where id = '${blockId}'`
    const data = (await this.sql(stmt)).data as any[]
    if (!data || data.length === 0) {
      throw new Error("通过ID查询块信息失败")
    }
    return data[0]
  }

  /**
   * 获取随机文档
   *
   * @param notebookId
   */
  public async getRandomRootBlocks(notebookId?: string): Promise<SiyuanData> {
    const condition = StrUtil.isEmptyString(notebookId) ? "" : `and box = '${notebookId}'`
    const stmt = `SELECT DISTINCT b.root_id, b.content FROM blocks b 
    WHERE 1=1 ${condition}
    ORDER BY random() LIMIT 1`
    this.logger.info("random sql =>", stmt)
    return await this.sql(stmt)
  }

  /**
   * 获取自定义SQL随机文档
   *
   * @param sql
   */
  public async getCustomRandomDocId(sql: string): Promise<SiyuanData> {
    this.logger.info("custom random sql =>", sql)
    return await this.sql(sql)
  }

  /**
   * 获取块属性
   */
  public async getBlockAttrs(blockId: string): Promise<SiyuanData> {
    return await this.siyuanRequest("/api/attr/getBlockAttrs", {
      id: blockId,
    })
  }

  /**
   * 设置块属性
   */
  public async setBlockAttrs(blockId: string, attrs: any): Promise<SiyuanData> {
    return await this.siyuanRequest("/api/attr/setBlockAttrs", {
      id: blockId,
      attrs: attrs,
    })
  }

  public async getDoc(docId: string): Promise<SiyuanData> {
    const params = {
      id: docId,
      isBacklink: false,
      mode: 0,
      size: 128,
    }
    const url = "/api/filetree/getDoc"
    return await this.siyuanRequest(url, params)
  }
}

export default KernelApi
